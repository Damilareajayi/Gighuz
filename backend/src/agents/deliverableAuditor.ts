import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../services/firebase';
import { captureEscrow } from '../services/stripe';
import { routePayout } from '../services/payouts';
import { runCommsAgent } from './commsAgent';
import { AuditorInput, AuditorOutput, Freelancer } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PROMPT = (input: AuditorInput) => `
You are GigHuz's Deliverable Auditor. You intercept freelancer submissions
BEFORE they reach the client. Your job is to verify the submission meets
the milestone acceptance criteria.

MILESTONE: ${input.milestone.name}
DELIVERABLE EXPECTED: ${input.milestone.deliverableDescription}
ACCEPTANCE CRITERIA:
${input.milestone.acceptanceCriteria.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}

SUBMISSION NOTES FROM FREELANCER:
${input.submission.notes}

FILES SUBMITTED: ${input.submission.files.length} file(s)
${input.submission.files.map((f, i) => `  File ${i + 1}: ${f.name} (${f.type}) — ${f.url}`).join('\n')}

DELIVERABLE TYPE: ${input.submission.deliverableType}

Run these checks for ${input.submission.deliverableType} deliverables:
${input.submission.deliverableType === 'code' ? `
- Does the submission describe working code (not just a plan)?
- Are there references to tests or working examples?
- Does it address the technical requirements in acceptance criteria?
` : input.submission.deliverableType === 'writing' ? `
- Is there evidence of original content (not generic filler)?
- Does the submission address the specific topic/brief?
- Does it meet the format requirements?
` : `
- Does the submission match the specified output format?
- Does it address all acceptance criteria?
- Is the scope complete (not partial)?
`}

Return ONLY valid JSON:
{
  "result": "pass" | "flag",
  "feedback": "<plain English feedback for the freelancer — specific and actionable>",
  "checks": [
    { "name": "<check name>", "passed": true/false, "detail": "<what was found>" }
  ]
}

If ALL critical criteria are met: result = "pass"
If ANY critical criterion is unmet or evidence is unclear: result = "flag" with specific feedback
`;

export async function runDeliverableAuditor(input: AuditorInput): Promise<AuditorOutput> {
  const { submission, milestone } = input;
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  let output: AuditorOutput;
  try {
    const result = await model.generateContent(PROMPT(input));
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    output = {
      submissionId: submission.id,
      result: parsed.result,
      feedback: parsed.feedback,
      checks: parsed.checks,
    };
  } catch {
    output = {
      submissionId: submission.id,
      result: 'flag',
      feedback: 'Automated audit could not complete. A human reviewer will assess your submission within 24 hours.',
      checks: [{ name: 'Auto-audit', passed: false, detail: 'System error — manual review queued' }],
    };
  }

  await db().collection('submissions').doc(submission.id).update({
    auditResult: output.result,
    auditFeedback: output.feedback,
    auditChecks: output.checks,
  });

  const freelancerDoc = await db().collection('freelancers').doc(submission.freelancerId).get();
  const freelancer = freelancerDoc.data() as Freelancer | undefined;

  if (output.result === 'pass') {
    if (milestone.stripePaymentIntentId) {
      await captureEscrow(milestone.stripePaymentIntentId);
    }

    let payout;
    if (freelancer) {
      payout = await routePayout(freelancer.id, milestone.paymentAmountUsd, `GH-${milestone.id.slice(0, 8).toUpperCase()}`, {
        country: freelancer.country,
        paystackRecipientCode: freelancer.paystackRecipientCode,
        bankCode: freelancer.bankCode,
        accountNumber: freelancer.accountNumber,
        accountName: freelancer.name,
        currency: freelancer.currency,
      });
    }

    await db().collection('milestones').doc(milestone.id).update({
      status: 'paid',
      approvedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(payout?.provider === 'paystack' ? { paystackTransferCode: payout.reference } : {}),
      ...(payout?.provider === 'flutterwave' ? { flutterwaveTransferId: payout.reference } : {}),
    });

    if (freelancer) {
      await db().collection('freelancers').doc(freelancer.id).update({
        totalEarnings: (freelancer.totalEarnings || 0) + Math.round(milestone.paymentAmountUsd * 100),
        completedJobs: (freelancer.completedJobs || 0) + 1,
      });

      await runCommsAgent({
        type: 'payment_sent',
        recipientId: freelancer.id,
        recipientRole: 'freelancer',
        whatsappNumber: freelancer.whatsappNumber,
        context: {
          amount: `$${milestone.paymentAmountUsd.toFixed(2)}`,
          reference: payout?.reference || '',
          milestoneName: milestone.name,
        },
      });
    }
  } else {
    await db().collection('milestones').doc(milestone.id).update({
      status: 'flagged',
      updatedAt: new Date().toISOString(),
    });

    if (freelancer) {
      await runCommsAgent({
        type: 'submission_audited',
        recipientId: freelancer.id,
        recipientRole: 'freelancer',
        whatsappNumber: freelancer.whatsappNumber,
        context: {
          milestoneName: milestone.name,
          result: 'flag',
          feedback: output.feedback,
        },
      });
    }
  }

  return output;
}
