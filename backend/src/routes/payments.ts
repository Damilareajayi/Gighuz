import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { db } from '../services/firebase';
import { createMilestoneEscrow } from '../services/stripe';
import { routePayout } from '../services/payouts';
import { MilestoneInstance, Job, ChangeRequest } from '../types';
import { runCommsAgent } from '../agents/commsAgent';
import { runScopeGuardAgent } from '../agents/scopeGuardAgent';

const router = Router();

const CreateMilestoneSchema = z.object({
  jobId: z.string(),
  milestoneTemplateId: z.string(),
  freelancerId: z.string(),
});

const ChangeRequestSchema = z.object({
  description: z.string().min(10).max(2000),
});

// POST /payments/milestones — recruiter funds a milestone (creates escrow)
router.post('/milestones', requireAuth(['recruiter']), async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, milestoneTemplateId, freelancerId } = CreateMilestoneSchema.parse(req.body);

    // Fetch job and find milestone template
    const jobDoc = await db().collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) return res.status(404).json({ success: false, error: 'Job not found' });

    const job = jobDoc.data() as Job;
    if (job.recruiterId !== req.profileId) {
      return res.status(403).json({ success: false, error: 'Not your job' });
    }

    const template = job.structuredMilestones.find((m) => m.id === milestoneTemplateId);
    if (!template) return res.status(404).json({ success: false, error: 'Milestone not found' });

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
      freelancerId,
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

    return res.status(201).json({
      success: true,
      data: {
        milestoneId,
        clientSecret: escrow.clientSecret,
        amount: template.paymentAmountUsd,
        message: 'Escrow created — complete payment to activate milestone',
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    return res.status(500).json({ success: false, error: 'Failed to create milestone' });
  }
});

// POST /payments/payout/:milestoneId — triggered by milestone.approved event
// (called internally by the pipeline after Auditor Agent approves)
router.post('/payout/:milestoneId', requireAuth(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const milestoneDoc = await db().collection('milestones').doc(req.params.milestoneId).get();
    if (!milestoneDoc.exists) return res.status(404).json({ success: false, error: 'Milestone not found' });

    const milestone = milestoneDoc.data() as MilestoneInstance;
    if (milestone.status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Milestone not yet approved by AI auditor' });
    }

    // Fetch freelancer payout details
    const freelancerDoc = await db().collection('freelancers').doc(milestone.freelancerId).get();
    const freelancer = freelancerDoc.data();
    if (!freelancer) return res.status(404).json({ success: false, error: 'Freelancer not found' });

    const reference = `GH-${milestone.id.slice(0, 8).toUpperCase()}`;

    // Platform fee: 18%
    const platformFee  = milestone.paymentAmountUsd * 0.18;
    const freelancerAmt = milestone.paymentAmountUsd - platformFee;

    const payout = await routePayout(
      milestone.freelancerId,
      freelancerAmt,
      reference,
      {
        country: freelancer.country,
        paystackRecipientCode: freelancer.paystackRecipientCode,
        bankCode: freelancer.bankCode,
        accountNumber: freelancer.accountNumber,
        accountName: freelancer.name,
        currency: freelancer.currency,
      }
    );

    // Update milestone to paid
    await db().collection('milestones').doc(milestone.id).update({
      status: 'paid',
      paystackTransferCode: payout.provider === 'paystack' ? payout.reference : undefined,
      flutterwaveTransferId: payout.provider === 'flutterwave' ? payout.reference : undefined,
      updatedAt: new Date().toISOString(),
    });

    // Update freelancer earnings
    await db().collection('freelancers').doc(milestone.freelancerId).update({
      totalEarnings: (freelancer.totalEarnings || 0) + Math.round(freelancerAmt * 100),
      completedJobs: (freelancer.completedJobs || 0) + 1,
    });

    // Notify freelancer
    await runCommsAgent({
      type: 'payment_sent',
      recipientId: milestone.freelancerId,
      recipientRole: 'freelancer',
      whatsappNumber: freelancer.whatsappNumber,
      context: {
        amount: `$${freelancerAmt.toFixed(2)}`,
        reference,
        milestoneName: milestone.name,
      },
    });

    return res.json({ success: true, data: { reference, amountPaid: freelancerAmt, provider: payout.provider } });
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
      freelancerId: milestone.freelancerId,
      description,
      verdict: scopeResult.verdict,
      reasoning: scopeResult.reasoning,
      suggestedAdditionalAmountUsd: scopeResult.suggestedAdditionalAmountUsd,
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
    const isParticipant = milestone.recruiterId === req.profileId || milestone.freelancerId === req.profileId;
    if (!isParticipant) return res.status(403).json({ success: false, error: 'Not your milestone' });

    const snap = await db().collection('changeRequests')
      .where('milestoneId', '==', req.params.id)
      .orderBy('createdAt', 'desc')
      .get();

    return res.json({ success: true, data: snap.docs.map((d) => d.data()) });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch change requests' });
  }
});

// GET /payments/milestones — list milestones for current user
router.get('/milestones', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const field = req.role === 'freelancer' ? 'freelancerId' : 'recruiterId';
    const snap = await db()
      .collection('milestones')
      .where(field, '==', req.profileId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    return res.json({ success: true, data: snap.docs.map((d) => d.data()) });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch milestones' });
  }
});

export default router;
