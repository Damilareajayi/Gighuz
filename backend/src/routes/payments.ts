import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { db } from '../services/firebase';
import { createMilestoneEscrow } from '../services/stripe';
import { routePayout } from '../services/payouts';
import { resolvePayoutTarget } from '../services/payoutTarget';
import { invokeAgent } from '../services/agentInvoker';
import { MilestoneInstance, Job, ChangeRequest, AgentListing, Submission, Rating } from '../types';
import { runCommsAgent } from '../agents/commsAgent';
import { runScopeGuardAgent } from '../agents/scopeGuardAgent';
import { runDeliverableAuditor } from '../agents/deliverableAuditor';

const router = Router();

const CreateMilestoneSchema = z.object({
  jobId: z.string(),
  milestoneTemplateId: z.string(),
  freelancerId: z.string().optional(),
  agentListingId: z.string().optional(),
}).refine((d) => Boolean(d.freelancerId) !== Boolean(d.agentListingId), {
  message: 'Provide exactly one of freelancerId or agentListingId',
});

const ChangeRequestSchema = z.object({
  description: z.string().min(10).max(2000),
});

const RatingSchema = z.object({
  score: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
});

/**
 * An AI-agent-fulfilled milestone doesn't wait for a human to log in and
 * submit work — we invoke the agent's endpoint immediately once escrow is
 * funded, wrap the result in a Submission, and run it through the exact
 * same Deliverable Auditor a human's work goes through.
 */
async function runAgentMilestone(milestone: MilestoneInstance) {
  try {
    if (!milestone.agentListingId) return;
    const listingDoc = await db().collection('agentListings').doc(milestone.agentListingId).get();
    const listing = listingDoc.data() as AgentListing | undefined;
    if (!listing) return;

    const result = await invokeAgent(listing, {
      taskId: milestone.id,
      title: milestone.name,
      description: milestone.deliverableDescription,
      acceptanceCriteria: milestone.acceptanceCriteria,
    });

    const submissionId = uuidv4();
    const now = new Date().toISOString();

    const submission: Submission = {
      id: submissionId,
      milestoneId: milestone.id,
      jobId: milestone.jobId,
      workerType: 'agent',
      agentListingId: listing.id,
      developerId: listing.developerId,
      files: [],
      notes: result.success ? result.output : `Agent invocation failed: ${result.error}`,
      deliverableType: 'other',
      auditResult: 'pending',
      submittedAt: now,
    };

    await db().collection('submissions').doc(submissionId).set(submission);
    await db().collection('milestones').doc(milestone.id).update({ status: 'auditing', submittedAt: now });

    await runDeliverableAuditor({ submission, milestone });
  } catch (err) {
    console.error('[Payments] Agent milestone pipeline failed:', err);
  }
}

// POST /payments/milestones — recruiter funds a milestone (creates escrow)
router.post('/milestones', requireAuth(['recruiter']), async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, milestoneTemplateId, freelancerId, agentListingId } = CreateMilestoneSchema.parse(req.body);

    // Fetch job and find milestone template
    const jobDoc = await db().collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) return res.status(404).json({ success: false, error: 'Job not found' });

    const job = jobDoc.data() as Job;
    if (job.recruiterId !== req.profileId) {
      return res.status(403).json({ success: false, error: 'Not your job' });
    }

    const template = job.structuredMilestones.find((m) => m.id === milestoneTemplateId);
    if (!template) return res.status(404).json({ success: false, error: 'Milestone not found' });

    let developerId: string | undefined;
    if (agentListingId) {
      const listingDoc = await db().collection('agentListings').doc(agentListingId).get();
      const listing = listingDoc.data() as AgentListing | undefined;
      if (!listing || listing.status !== 'active') {
        return res.status(404).json({ success: false, error: 'Agent listing not found or inactive' });
      }
      developerId = listing.developerId;
    }

    // Create Stripe escrow
    const escrow = await createMilestoneEscrow(
      milestoneTemplateId,
      template.paymentAmountUsd,
      req.profileId!,
      job.title
    );

    // Create milestone instance
    const milestoneId = uuidv4();
    const now = new Date().toISOString();
    const due = new Date(Date.now() + template.durationDays * 86400000).toISOString();

    const milestone: MilestoneInstance = {
      id: milestoneId,
      jobId,
      milestoneTemplateId,
      workerType: agentListingId ? 'agent' : 'human',
      ...(freelancerId ? { freelancerId } : {}),
      ...(agentListingId ? { agentListingId } : {}),
      ...(developerId ? { developerId } : {}),
      recruiterId: req.profileId!,
      name: template.name,
      deliverableDescription: template.deliverableDescription,
      acceptanceCriteria: template.acceptanceCriteria,
      paymentAmountUsd: template.paymentAmountUsd,
      status: 'pending',
      stripePaymentIntentId: escrow.paymentIntentId,
      stripeEscrowAmount: escrow.amount,
      dueDate: due,
      createdAt: now,
      updatedAt: now,
    };

    await db().collection('milestones').doc(milestoneId).set(milestone);

    // In principle escrow funding should complete via the Stripe webhook,
    // but the frontend has no Stripe Elements flow to actually collect a
    // card yet, and the webhook handler doesn't invoke the agent even when
    // it does fire -- so this is the only reachable path today. Kick the
    // agent off immediately; the escrow is still authorize-only until the
    // Deliverable Auditor passes it, so nothing is paid prematurely.
    if (agentListingId) {
      db().collection('milestones').doc(milestoneId).update({ status: 'in_progress', updatedAt: new Date().toISOString() })
        .then(() => runAgentMilestone({ ...milestone, status: 'in_progress' }))
        .catch((err) => console.error('[Payments] Failed to kick off agent milestone:', err));
    }

    return res.status(201).json({
      success: true,
      data: {
        milestoneId,
        clientSecret: escrow.clientSecret,
        amount: template.paymentAmountUsd,
        message: agentListingId
          ? 'Escrow created — the agent has been invoked and will be audited automatically'
          : 'Escrow created — complete payment to activate milestone',
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    return res.status(500).json({ success: false, error: 'Failed to create milestone' });
  }
});

// POST /payments/payout/:milestoneId — manual payout trigger (admin override)
router.post('/payout/:milestoneId', requireAuth(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const milestoneDoc = await db().collection('milestones').doc(req.params.milestoneId).get();
    if (!milestoneDoc.exists) return res.status(404).json({ success: false, error: 'Milestone not found' });

    const milestone = milestoneDoc.data() as MilestoneInstance;
    if (milestone.status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Milestone not yet approved by AI auditor' });
    }

    const target = await resolvePayoutTarget(milestone);
    if (!target) return res.status(404).json({ success: false, error: 'Payout recipient not found' });

    const reference = `GH-${milestone.id.slice(0, 8).toUpperCase()}`;

    // Platform fee: 18%
    const platformFee = milestone.paymentAmountUsd * 0.18;
    const payoutAmt = milestone.paymentAmountUsd - platformFee;

    const payout = await routePayout(target.id, payoutAmt, reference, {
      country: target.country,
      paystackRecipientCode: target.paystackRecipientCode,
      bankCode: target.bankCode,
      accountNumber: target.accountNumber,
      accountName: target.accountName,
      currency: target.currency,
    });

    // Update milestone to paid
    await db().collection('milestones').doc(milestone.id).update({
      status: 'paid',
      paystackTransferCode: payout.provider === 'paystack' ? payout.reference : undefined,
      flutterwaveTransferId: payout.provider === 'flutterwave' ? payout.reference : undefined,
      updatedAt: new Date().toISOString(),
    });

    // Update recipient earnings
    const targetRef = db().collection(target.collection).doc(target.id);
    const targetData = (await targetRef.get()).data();
    await targetRef.update({
      totalEarnings: (targetData?.totalEarnings || 0) + Math.round(payoutAmt * 100),
      ...(target.collection === 'freelancers'
        ? { completedJobs: (targetData?.completedJobs || 0) + 1 }
        : { completedTasks: (targetData?.completedTasks || 0) + 1 }),
    });

    // Notify recipient
    await runCommsAgent({
      type: 'payment_sent',
      recipientId: target.id,
      recipientRole: target.commsRole,
      whatsappNumber: target.whatsappNumber,
      context: {
        amount: `$${payoutAmt.toFixed(2)}`,
        reference,
        milestoneName: milestone.name,
      },
    });

    return res.json({ success: true, data: { reference, amountPaid: payoutAmt, provider: payout.provider } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /payments/milestones/:id/change-requests — recruiter asks for a change;
// the Scope Guard Agent rules whether it's free or needs its own payment
router.post('/milestones/:id/change-requests', requireAuth(['recruiter']), async (req: AuthRequest, res: Response) => {
  try {
    const { description } = ChangeRequestSchema.parse(req.body);

    const milestoneDoc = await db().collection('milestones').doc(req.params.id).get();
    if (!milestoneDoc.exists) return res.status(404).json({ success: false, error: 'Milestone not found' });

    const milestone = milestoneDoc.data() as MilestoneInstance;
    if (milestone.recruiterId !== req.profileId) {
      return res.status(403).json({ success: false, error: 'Not your milestone' });
    }

    const scopeResult = await runScopeGuardAgent({ milestone, requestDescription: description });

    const changeRequest: ChangeRequest = {
      id: uuidv4(),
      milestoneId: milestone.id,
      jobId: milestone.jobId,
      recruiterId: milestone.recruiterId,
      workerType: milestone.workerType,
      ...(milestone.freelancerId ? { freelancerId: milestone.freelancerId } : {}),
      ...(milestone.developerId ? { developerId: milestone.developerId } : {}),
      description,
      verdict: scopeResult.verdict,
      ...(scopeResult.reasoning ? { reasoning: scopeResult.reasoning } : {}),
      ...(scopeResult.suggestedAdditionalAmountUsd !== undefined ? { suggestedAdditionalAmountUsd: scopeResult.suggestedAdditionalAmountUsd } : {}),
      createdAt: new Date().toISOString(),
    };

    await db().collection('changeRequests').doc(changeRequest.id).set(changeRequest);

    return res.status(201).json({ success: true, data: changeRequest });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    return res.status(500).json({ success: false, error: err.message || 'Failed to create change request' });
  }
});

// GET /payments/milestones/:id/change-requests — list them for a milestone
router.get('/milestones/:id/change-requests', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const milestoneDoc = await db().collection('milestones').doc(req.params.id).get();
    if (!milestoneDoc.exists) return res.status(404).json({ success: false, error: 'Milestone not found' });

    const milestone = milestoneDoc.data() as MilestoneInstance;
    const isParticipant = milestone.recruiterId === req.profileId
      || milestone.freelancerId === req.profileId
      || milestone.developerId === req.profileId;
    if (!isParticipant) return res.status(403).json({ success: false, error: 'Not your milestone' });

    const snap = await db().collection('changeRequests')
      .where('milestoneId', '==', req.params.id)
      .orderBy('createdAt', 'desc')
      .get();

    return res.json({ success: true, data: snap.docs.map((d) => d.data()) });
  } catch (err) {
    console.error('[payments] list change requests failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch change requests' });
  }
});

// POST /payments/milestones/:id/rate — recruiter rates the completed work
// (human or AI agent) after payment has already released. This never
// affects the payment itself — it's a reputation signal for future
// matching/browsing, not a claw-back mechanism. See ARCHITECTURE.md for why.
router.post('/milestones/:id/rate', requireAuth(['recruiter']), async (req: AuthRequest, res: Response) => {
  try {
    const { score, feedback } = RatingSchema.parse(req.body);

    const milestoneDoc = await db().collection('milestones').doc(req.params.id).get();
    if (!milestoneDoc.exists) return res.status(404).json({ success: false, error: 'Milestone not found' });

    const milestone = milestoneDoc.data() as MilestoneInstance;
    if (milestone.recruiterId !== req.profileId) {
      return res.status(403).json({ success: false, error: 'Not your milestone' });
    }
    if (milestone.status !== 'paid') {
      return res.status(400).json({ success: false, error: 'Only paid milestones can be rated' });
    }

    const existing = await db().collection('ratings').where('milestoneId', '==', req.params.id).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ success: false, error: 'This milestone has already been rated' });
    }

    const rating: Rating = {
      id: uuidv4(),
      milestoneId: milestone.id,
      jobId: milestone.jobId,
      recruiterId: milestone.recruiterId,
      workerType: milestone.workerType,
      ...(milestone.freelancerId ? { freelancerId: milestone.freelancerId } : {}),
      ...(milestone.agentListingId ? { agentListingId: milestone.agentListingId } : {}),
      ...(milestone.developerId ? { developerId: milestone.developerId } : {}),
      score,
      ...(feedback ? { feedback } : {}),
      createdAt: new Date().toISOString(),
    };

    await db().collection('ratings').doc(rating.id).set(rating);

    // Update the worker's running average — a freelancer's rating lives on
    // their profile, but an agent's rating lives on the specific listing,
    // since one developer's different agents can vary wildly in quality.
    const targetCollection = milestone.workerType === 'agent' ? 'agentListings' : 'freelancers';
    const targetId = milestone.workerType === 'agent' ? milestone.agentListingId : milestone.freelancerId;

    if (targetId) {
      const targetRef = db().collection(targetCollection).doc(targetId);
      const targetData = (await targetRef.get()).data() as { averageRating?: number; ratingCount?: number } | undefined;
      const oldCount = targetData?.ratingCount || 0;
      const oldAverage = targetData?.averageRating || 0;
      const newCount = oldCount + 1;
      const newAverage = Math.round(((oldAverage * oldCount + score) / newCount) * 10) / 10;

      await targetRef.update({
        averageRating: newAverage,
        ratingCount: newCount,
        ...(targetCollection === 'agentListings' ? { updatedAt: new Date().toISOString() } : {}),
      });
    }

    return res.status(201).json({ success: true, data: rating });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    return res.status(500).json({ success: false, error: err.message || 'Failed to submit rating' });
  }
});

// GET /payments/milestones/:id/rating — fetch the rating for a milestone, if any
router.get('/milestones/:id/rating', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const milestoneDoc = await db().collection('milestones').doc(req.params.id).get();
    if (!milestoneDoc.exists) return res.status(404).json({ success: false, error: 'Milestone not found' });

    const milestone = milestoneDoc.data() as MilestoneInstance;
    const isParticipant = milestone.recruiterId === req.profileId
      || milestone.freelancerId === req.profileId
      || milestone.developerId === req.profileId;
    if (!isParticipant) return res.status(403).json({ success: false, error: 'Not your milestone' });

    const snap = await db().collection('ratings').where('milestoneId', '==', req.params.id).limit(1).get();
    return res.json({ success: true, data: snap.empty ? null : snap.docs[0].data() });
  } catch (err) {
    console.error('[payments] fetch rating failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch rating' });
  }
});

// GET /payments/milestones — list milestones for current user
router.get('/milestones', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const field = req.role === 'freelancer' ? 'freelancerId'
      : req.role === 'agent_developer' ? 'developerId'
      : 'recruiterId';

    const snap = await db()
      .collection('milestones')
      .where(field, '==', req.profileId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    return res.json({ success: true, data: snap.docs.map((d) => d.data()) });
  } catch (err) {
    console.error('[payments] list milestones failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch milestones' });
  }
});

export default router;
