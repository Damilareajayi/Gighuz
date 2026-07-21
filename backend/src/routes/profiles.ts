import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { db } from '../services/firebase';
import { uploadFile, extensionForMimeType } from '../services/storage';
import { runResumeAgent } from '../agents/resumeAgent';
import { Freelancer } from '../types';

const router = Router();
const resumeLimiter = rateLimit({ windowMs: 60_000, max: 10 });

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('File must be an image'));
    cb(null, true);
  },
});

const uploadResumeFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Resume must be a PDF or Word document'));
    cb(null, true);
  },
});

const FreelancerSchema = z.object({
  name: z.string().min(2).max(100),
  country: z.string().length(2),
  bio: z.string().min(50).max(1000),
  skills: z.array(z.string()).min(1).max(20),
  portfolioLinks: z.array(z.string().url()).max(5).default([]),
  hourlyRate: z.number().positive().optional(),
  currency: z.string().length(3).default('USD'),
  whatsappNumber: z.string().optional(),
});

const RecruiterSchema = z.object({
  name: z.string().min(2).max(100),
  company: z.string().optional(),
  country: z.string().length(2),
});

// POST /profiles/freelancer — onboard a new freelancer
router.post('/freelancer', async (req: AuthRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'Auth required' });

    const decoded = await (await import('../services/firebase')).auth().verifyIdToken(token);
    const data = FreelancerSchema.parse(req.body);

    // Check if already exists
    const existing = await db().collection('freelancers').where('uid', '==', decoded.uid).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ success: false, error: 'Profile already exists' });
    }

    const id  = uuidv4();
    const now = new Date().toISOString();
    const profile = {
      id,
      uid: decoded.uid,
      role: 'freelancer',
      ...data,
      expertiseClusterScore: 50,
      availability: 'open',
      verified: false,
      totalEarnings: 0,
      completedJobs: 0,
      averageRating: 0,
      createdAt: now,
    };

    await db().collection('freelancers').doc(id).set(profile);
    return res.status(201).json({ success: true, data: profile });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    return res.status(500).json({ success: false, error: 'Failed to create profile' });
  }
});

// POST /profiles/recruiter — onboard a new recruiter
router.post('/recruiter', async (req: AuthRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'Auth required' });

    const decoded = await (await import('../services/firebase')).auth().verifyIdToken(token);
    const data = RecruiterSchema.parse(req.body);

    const existing = await db().collection('recruiters').where('uid', '==', decoded.uid).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ success: false, error: 'Profile already exists' });
    }

    const id  = uuidv4();
    const now = new Date().toISOString();
    const profile = {
      id, uid: decoded.uid, role: 'recruiter',
      ...data,
      verified: false, totalSpent: 0, jobsPosted: 0, createdAt: now,
    };

    await db().collection('recruiters').doc(id).set(profile);
    return res.status(201).json({ success: true, data: profile });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    return res.status(500).json({ success: false, error: 'Failed to create profile' });
  }
});

// GET /profiles/me — get own profile
router.get('/me', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const collection = req.role === 'freelancer' ? 'freelancers' : 'recruiters';
    const doc = await db().collection(collection).doc(req.profileId!).get();
    return res.json({ success: true, data: doc.data() });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// PATCH /profiles/me — update own profile
router.patch('/me', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const collection = req.role === 'freelancer' ? 'freelancers' : 'recruiters';
    const allowed = req.role === 'freelancer'
      ? ['bio', 'skills', 'hourlyRate', 'currency', 'portfolioLinks', 'whatsappNumber', 'availability']
      : ['name', 'company'];

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates['updatedAt'] = new Date().toISOString();

    await db().collection(collection).doc(req.profileId!).update(updates);
    return res.json({ success: true, message: 'Profile updated' });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// POST /profiles/me/avatar — upload a profile picture (either role)
router.post('/me/avatar', requireAuth(), uploadImage.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const ext = extensionForMimeType(req.file.mimetype) || 'jpg';
    const url = await uploadFile(`avatars/${req.profileId}`, req.file.buffer, req.file.mimetype, ext);

    const collection = req.role === 'freelancer' ? 'freelancers' : 'recruiters';
    await db().collection(collection).doc(req.profileId!).update({
      profilePictureUrl: url,
      updatedAt: new Date().toISOString(),
    });

    return res.json({ success: true, data: { profilePictureUrl: url } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to upload image' });
  }
});

// POST /profiles/me/resume — upload a resume file (freelancer only)
router.post('/me/resume', requireAuth(['freelancer']), uploadResumeFile.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const ext = extensionForMimeType(req.file.mimetype) || 'pdf';
    const url = await uploadFile(`resumes/${req.profileId}`, req.file.buffer, req.file.mimetype, ext);
    const now = new Date().toISOString();

    await db().collection('freelancers').doc(req.profileId!).update({
      resumeUrl: url,
      resumeSource: 'uploaded',
      resumeUpdatedAt: now,
      updatedAt: now,
    });

    return res.json({ success: true, data: { resumeUrl: url, resumeSource: 'uploaded' } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to upload resume' });
  }
});

// POST /profiles/me/resume/generate — AI-generate a resume from the freelancer's profile
router.post('/me/resume/generate', requireAuth(['freelancer']), resumeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db().collection('freelancers').doc(req.profileId!).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Profile not found' });

    const freelancer = doc.data() as Freelancer;
    const resumeText = await runResumeAgent(freelancer);
    const now = new Date().toISOString();

    await db().collection('freelancers').doc(req.profileId!).update({
      resumeText,
      resumeSource: 'ai_generated',
      resumeUpdatedAt: now,
      updatedAt: now,
    });

    return res.json({ success: true, data: { resumeText, resumeSource: 'ai_generated' } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to generate resume' });
  }
});

// GET /profiles/freelancers — recruiter browses talent
router.get('/freelancers', requireAuth(['recruiter']), async (req: AuthRequest, res: Response) => {
  try {
    const skill   = req.query.skill as string | undefined;
    const country = req.query.country as string | undefined;

    let query = db().collection('freelancers')
      .where('availability', '==', 'open')
      .where('verified', '==', true) as FirebaseFirestore.Query;

    if (country) query = query.where('country', '==', country);

    const snap = await query.limit(30).get();
    let profiles = snap.docs.map((d) => d.data());

    if (skill) {
      profiles = profiles.filter((p: any) =>
        p.skills?.some((s: string) => s.toLowerCase().includes(skill.toLowerCase()))
      );
    }

    return res.json({ success: true, data: profiles });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch freelancers' });
  }
});

export default router;
