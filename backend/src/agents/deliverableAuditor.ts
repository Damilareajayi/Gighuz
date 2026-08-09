import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/firebase';
import { captureEscrow } from '../services/stripe';
import { routePayout } from '../services/payouts';
import { resolvePayoutTarget } from '../services/payoutTarget';
import { runCommsAgent } from './commsAgent';
import { runCaseStudyAgent } from './caseStudyAgent';
import { AuditorInput, AuditorOutput, Freelancer, AgentDeveloper, AgentListing, Job, CaseStudy, Submission, MilestoneInstance } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PROMPT = (input: AuditorInput) => `
You are GigHuz's Deliverable Auditor. You intercept freelancer and AI-agent
submissions BEFORE they reach the client. Your job is to verify the
submission meets the milestone acceptance criteria — the same bar applies
regardless of whether a human or an AI agent produced the work.

MILESTONE: ${input.milestone.name}
DELIVERABLE EXPECTED: ${input.milestone.deliverableDescription}
ACCEPTANCE CRITERIA:
${input.milestone.acceptanceCriteria.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}

SUBMITTED BY: ${input.submission.workerType === 'agent' ? 'an AI agent' : 'a freelancer'}
SUBMISSION NOTES:
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
  "feedback": "<plain English feedback for whoever submitted — specific and actionable>",
  "checks": [
    { "name": "<check name>", "passed": true/false, "detail": "<what was found>" }
  ]
}

If ALL critical criteria are met: result = "pass"
If ANY critical criterion is unmet or evidence is unclear: result = "flag" with specific feedback
`;

async function buildCaseStudy(submission: Submission, milestone: MilestoneInstance, feedback: string) {
  // Portfolio-building only makes sense for human freelancers today — an AI
  // agent's "portfolio" is its completedTasks count, updated separately below.
  if (submission.workerType !== 'human' || !submission.freelancerId) return;

  try {
    const jobDoc = await db().collection('jobs').doc(milestone.jobId).get();
    const job = jobDoc.data() as Job | undefined;

    const caseStudyOutput = await runCaseStudyAgent({
      jobTitle: job?.title || milestone.name,
      milestoneName: milestone.name,
      deliverableDescription: milestone.deliverableDescription,
      acceptanceCriteria: milestone.acceptanceCriteria,
      submissionNotes: submission.notes,
      skillsUsed: job?.skillsRequired || [],
      auditFeedback: feedback,
    });

    const caseStudy: CaseStudy = {
      id: uuidv4(),
      freelancerId: submission.freelancerId,
      jobId: milestone.jobId,
      milestoneId: milestone.id,
      jobTitle: job?.title || milestone.name,
      summary: caseStudyOutput.summary,
      skillsUsed: job?.skillsRequired || [],
      outcomeHighlight: caseStudyOutput.outcomeHighlight,
      createdAt: new Date().toISOString(),
    };

    await db().collection('freelancers').doc(submission.freelancerId)
      .collection('caseStudies').doc(caseStudy.id).set(caseStudy);
  } catch (err) {
    console.error('[DeliverableAuditor] Case study generation failed:', err);
  }
}

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

  const target = await resolvePayoutTarget(submission);

  if (output.result === 'pass') {
    if (milestone.stripePaymentIntentId) {
      await captureEscrow(milestone.stripePaymentIntentId);
    }

    let payout;
    if (target) {
      payout = await routePayout(target.id, milestone.paymentAmountUsd, `GH-${milestone.id.slice(0, 8).toUpperCase()}`, {
        country: target.country,
        paystackRecipientCode: target.paystackRecipientCode,
        bankCode: target.bankCode,
        accountNumber: target.accountNumber,
        accountName: target.accountName,
        currency: target.currency,
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

    if (target) {
      const earningsIncrement = Math.round(milestone.paymentAmountUsd * 100);
      const targetRef = db().collection(target.collection).doc(target.id);
      const targetDoc = await targetRef.get();
      const targetData = targetDoc.data() as (Freelancer | AgentDeveloper) | undefined;

      if (target.collection === 'freelancers') {
        await targetRef.update({
          totalEarnings: (targetData?.totalEarnings || 0) + earningsIncrement,
          completedJobs: ((targetData as Freelancer)?.completedJobs || 0) + 1,
        });
      } else {
        await targetRef.update({
          totalEarnings: (targetData?.totalEarnings || 0) + earningsIncrement,
          completedTasks: ((targetData as AgentDeveloper)?.completedTasks || 0) + 1,
        });
      }

      if (submission.workerType === 'agent' && submission.agentListingId) {
        const listingRef = db().collection('agentListings').doc(submission.agentListingId);
        const listing = (await listingRef.get()).data() as AgentListing | undefined;
        await listingRef.update({ completedTasks: (listing?.completedTasks || 0) + 1, updatedAt: new Date().toISOString() });
      }

      await runCommsAgent({
        type: 'payment_sent',
        recipientId: target.id,
        recipientRole: target.commsRole,
        whatsappNumber: target.whatsappNumber,
        context: {
          amount: `$${milestone.paymentAmountUsd.toFixed(2)}`,
          reference: payout?.reference || '',
          milestoneName: milestone.name,
        },
      });

      await buildCaseStudy(submission, milestone, output.feedback);
    }
  } else {
    await db().collection('milestones').doc(milestone.id).update({
      status: 'flagged',
      updatedAt: new Date().toISOString(),
    });

    if (target) {
      await runCommsAgent({
        type: 'submission_audited',
        recipientId: target.id,
        recipientRole: target.commsRole,
        whatsappNumber: target.whatsappNumber,
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
