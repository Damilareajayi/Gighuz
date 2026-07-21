import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { db } from '../services/firebase';
import { publishEvent } from '../services/pubsub';
import { runStructuringAgent } from '../agents/structuringAgent';
import { runMatchingAgent } from '../agents/matchingAgent';
import { Job } from '../types';

const router = Router();
const aiLimiter = rateLimit({ windowMs: 60_000, max: 10 });

const PostJobSchema = z.object({
  descriptionRaw: z.string().min(50).max(5000),
  source: z.enum(['direct', 'scraped']).default('direct'),
  sourceUrl: z.string().url().optional(),
});

// POST /jobs — recruiter posts a job
router.post('/', requireAuth(['recruiter']), async (req: AuthRequest, res: Response) => {
  try {
    const { descriptionRaw, source, sourceUrl } = PostJobSchema.parse(req.body);

    const jobId = uuidv4();
    const now = new Date().toISOString();

    const job: Job = {
      id: jobId,
      recruiterId: req.profileId!,
      descriptionRaw,
      status: 'pending_structure',
      source,
      sourceUrl,
      structuredMilestones: [],
      skillsRequired: [],
      budgetMinUsd: 0,
      budgetMaxUsd: 0,
      timelineDays: 0,
      matchedCandidateIds: [],
      title: '',
      createdAt: now,
      updatedAt: now,
    };

    await db().collection('jobs').doc(jobId).set(job);

    // Trigger Structuring Agent asynchronously
    await publishEvent('job.posted', { jobId, recruiterId: req.profileId });

    // Also run synchronously in dev/demo mode
    if (process.env.NODE_ENV !== 'production') {
      runStructuringAgent({ jobId, recruiterId: req.profileId!, descriptionRaw }).catch(
        (err) => console.error('[Jobs] Structuring agent error:', err)
      );
    }

    return res.status(201).json({ success: true, data: { jobId, status: 'pending_structure' } });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    return res.status(500).json({ success: false, error: 'Failed to post job' });
  }
});

// GET /jobs — list jobs (recruiter sees their own, freelancer sees matched)
router.get('/', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    let query = db().collection('jobs') as FirebaseFirestore.Query;

    if (req.role === 'recruiter') {
      query = query.where('recruiterId', '==', req.profileId);
    } else {
      // Freelancer: show structured/matched jobs
      query = query.where('status', 'in', ['structured', 'matched', 'in_progress']);
    }

    const snap = await query.orderBy('createdAt', 'desc').limit(20).get();
    const jobs = snap.docs.map((d) => d.data());

    return res.json({ success: true, data: jobs });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
  }
});

// GET /jobs/:id — get single job
router.get('/:id', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db().collection('jobs').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Job not found' });
    return res.json({ success: true, data: doc.data() });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch job' });
  }
});

// POST /jobs/:id/structure — manually trigger structuring agent
router.post('/:id/structure', requireAuth(['recruiter']), aiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db().collection('jobs').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Job not found' });

    const job = doc.data() as Job;
    if (job.recruiterId !== req.profileId) {
      return res.status(403).json({ success: false, error: 'Not your job' });
    }

    const output = await runStructuringAgent({
      jobId: job.id,
      recruiterId: job.recruiterId,
      descriptionRaw: job.descriptionRaw,
    });

    return res.json({ success: true, data: output });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /jobs/:id/match — trigger matching agent
router.post('/:id/match', requireAuth(['recruiter']), aiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db().collection('jobs').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Job not found' });

    const job = doc.data() as Job;
    if (job.status === 'pending_structure') {
      return res.status(400).json({ success: false, error: 'Job must be structured before matching' });
    }

    const output = await runMatchingAgent({ job });
    return res.json({ success: true, data: output });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /jobs/:id/assign — recruiter assigns a matched freelancer
router.post('/:id/assign', requireAuth(['recruiter']), async (req: AuthRequest, res: Response) => {
  try {
    const { freelancerId } = z.object({ freelancerId: z.string() }).parse(req.body);
    const doc = await db().collection('jobs').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Job not found' });

    await db().collection('jobs').doc(req.params.id).update({
      assignedFreelancerId: freelancerId,
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    });

    return res.json({ success: true, message: 'Freelancer assigned' });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    return res.status(500).json({ success: false, error: 'Assignment failed' });
  }
});

export default router;
