import { Router, Request, Response } from 'express';
import { stripe } from '../services/stripe';
import { db } from '../services/firebase';

const router = Router();

// POST /webhooks/stripe
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('[Webhook] Stripe signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as any;
    const milestoneId = pi.metadata?.milestoneId;

    if (milestoneId) {
      await db().collection('milestones').doc(milestoneId).update({
        status: 'in_progress',
        updatedAt: new Date().toISOString(),
      });
      console.log(`[Webhook] Milestone ${milestoneId} funded → in_progress`);
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as any;
    const milestoneId = pi.metadata?.milestoneId;

    if (milestoneId) {
      await db().collection('milestones').doc(milestoneId).update({
        status: 'pending',
        updatedAt: new Date().toISOString(),
      });
      console.warn(`[Webhook] Payment failed for milestone ${milestoneId}`);
    }
  }

  return res.json({ received: true });
});

// POST /webhooks/flutterwave
router.post('/flutterwave', async (req: Request, res: Response) => {
  const payload = req.body;
  console.log('[Webhook] Flutterwave event:', payload?.event, payload?.data?.reference);
  // Handle transfer completion events here
  return res.json({ status: 'ok' });
});

export default router;
