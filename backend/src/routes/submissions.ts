import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { db } from '../services/firebase';
import { publishEvent } from '../services/pubsub';
import { runDeliverableAuditor } from '../agents/deliverableAuditor';
import { Submission, MilestoneInstance } from '../types';

const router = Router();

const SubmitSchema = z.object({
  milestoneId: z.string(),
  files: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.string(),
    sizeBytes: z.number(),
  })).min(1).max(10),
  notes: z.string().max(2000).default(''),
  deliverableType: z.enum(['code', 'writing', 'design', 'data', 'other']).default('other'),
});

// POST /submissions — freelancer submits work for a milestone
router.post('/', requireAuth(['freelancer']), async (req: AuthRequest, res: Response) => {
  try {
    const data = SubmitSchema.parse(req.body);

    // Verify milestone belongs to this freelancer
    const milestoneDoc = await db().collection('milestones').doc(data.milestoneId).get();
    if (!milestoneDoc.exists) {
      return res.status(404).json({ success: false, error: 'Milestone not found' });
    }

    const milestone = milestoneDoc.data() as MilestoneInstance;
    if (milestone.freelancerId !== req.profileId) {
      return res.status(403).json({ success: false, error: 'This milestone is not assigned to you' });
    }
    if (milestone.status === 'approved' || milestone.status === 'paid') {
      return res.status(400).json({ success: false, error: 'Milestone already completed' });
    }

    const submissionId = uuidv4();
    const now = new Date().toISOString();

    const submission: Submission = {
      id: submissionId,
      milestoneId: data.milestoneId,
      jobId: milestone.jobId,
      freelancerId: req.profileId!,
      files: data.files,
      notes: data.notes,
      deliverableType: data.deliverableType,
      auditResult: 'pending',
      submittedAt: now,
    };

    await db().collection('submissions').doc(submissionId).set(submission);

    // Update milestone status
    await db().collection('milestones').doc(data.milestoneId).update({
      status: 'submitted',
      updatedAt: now,
    });

    // Trigger Auditor Agent via Pub/Sub
    await publishEvent('submission.received', {
      submissionId,
      milestoneId: data.milestoneId,
      freelancerId: req.profileId,
    });

    // Run auditor immediately in dev/demo mode
    if (process.env.NODE_ENV !== 'production') {
      runDeliverableAuditor({ submission, milestone }).catch(
        (err) => console.error('[Submissions] Auditor error:', err)
      );
    }

    return res.status(201).json({
      success: true,
      data: { submissionId, status: 'auditing', message: 'Submission received — AI audit in progress' },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    return res.status(500).json({ success: false, error: 'Failed to submit work' });
  }
});

// GET /submissions — list submissions
router.get('/', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const field = req.role === 'freelancer' ? 'freelancerId' : 'jobId';
    const value = req.role === 'freelancer' ? req.profileId : req.query.jobId;

    if (!value) return res.status(400).json({ success: false, error: 'Missing filter' });

    const snap = await db()
      .collection('submissions')
      .where(field, '==', value)
      .orderBy('submittedAt', 'desc')
      .limit(20)
      .get();

    return res.json({ success: true, data: snap.docs.map((d) => d.data()) });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
  }
});

// GET /submissions/:id — get single submission with audit result
router.get('/:id', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db().collection('submissions').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Submission not found' });
    return res.json({ success: true, data: doc.data() });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch submission' });
  }
});

export default router;
