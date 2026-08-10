import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { db } from '../services/firebase';
import { AgentListing } from '../types';

const router = Router();

const CATEGORIES = [
  'branding', 'digital_marketing', 'graphic_design', 'software_development',
  'presentation', 'seo', 'content_writing', 'data_analysis', 'customer_support', 'other',
] as const;

const AgentListingSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(20).max(1000),
  category: z.enum(CATEGORIES),
  capabilities: z.array(z.string()).min(1).max(20),
  endpointUrl: z.string().url(),
  authHeader: z.string().max(500).optional(),
  pricePerTaskUsd: z.number().positive(),
});

// POST /agent-listings — register a new agent (free — no listing fee)
router.post('/', requireAuth(['agent_developer']), async (req: AuthRequest, res: Response) => {
  try {
    const data = AgentListingSchema.parse(req.body);
    const id = uuidv4();
    const now = new Date().toISOString();

    const listing: AgentListing = {
      id,
      developerId: req.profileId!,
      ...data,
      status: 'active',
      completedTasks: 0,
      averageRating: 0,
      ratingCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db().collection('agentListings').doc(id).set(listing);
    return res.status(201).json({ success: true, data: listing });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    return res.status(500).json({ success: false, error: 'Failed to register agent' });
  }
});

// GET /agent-listings — recruiters browse the catalog
router.get('/', requireAuth(['recruiter']), async (req: AuthRequest, res: Response) => {
  try {
    const category = req.query.category as string | undefined;

    let query = db().collection('agentListings').where('status', '==', 'active') as FirebaseFirestore.Query;
    if (category) query = query.where('category', '==', category);

    const snap = await query.limit(50).get();
    return res.json({ success: true, data: snap.docs.map((d) => d.data()) });
  } catch (err) {
    console.error('[agentListings] catalog fetch failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch agent listings' });
  }
});

// GET /agent-listings/mine — agent developer's own listings + stats
router.get('/mine', requireAuth(['agent_developer']), async (req: AuthRequest, res: Response) => {
  try {
    const snap = await db().collection('agentListings')
      .where('developerId', '==', req.profileId)
      .orderBy('createdAt', 'desc')
      .get();
    return res.json({ success: true, data: snap.docs.map((d) => d.data()) });
  } catch (err) {
    console.error('[agentListings] mine fetch failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch your agent listings' });
  }
});

// PATCH /agent-listings/:id — update your own listing
router.patch('/:id', requireAuth(['agent_developer']), async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db().collection('agentListings').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Listing not found' });

    const listing = doc.data() as AgentListing;
    if (listing.developerId !== req.profileId) {
      return res.status(403).json({ success: false, error: 'Not your listing' });
    }

    const allowed = ['name', 'description', 'capabilities', 'endpointUrl', 'authHeader', 'pricePerTaskUsd', 'status'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates['updatedAt'] = new Date().toISOString();

    await db().collection('agentListings').doc(req.params.id).update(updates);
    return res.json({ success: true, message: 'Listing updated' });
  } catch (err) {
    console.error('[agentListings] update failed:', err);
    return res.status(500).json({ success: false, error: 'Failed to update listing' });
  }
});

export default router;
