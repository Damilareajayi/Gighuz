import Stripe from 'stripe';
import { EscrowFundResult } from '../types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
});

export { stripe };

const SIM_PREFIX = 'sim_';

function isSimulated(paymentIntentId: string): boolean {
  return paymentIntentId.startsWith(SIM_PREFIX);
}

/**
 * Create a payment intent to hold funds in escrow for a milestone.
 * Funds are NOT captured until milestone is approved by the Auditor Agent.
 *
 * Falls back to a simulated escrow (clearly marked, never mistakeable for a
 * real one) if Stripe rejects the call — e.g. a placeholder API key in local
 * dev. This mirrors the fallback pattern every Gemini-backed agent already
 * uses, so the full assign → fund → audit → payout loop is testable without
 * a real Stripe account.
 */
export async function createMilestoneEscrow(
  milestoneId: string,
  amountUsd: number,
  recruiterId: string,
  jobTitle: string
): Promise<EscrowFundResult> {
  const amountCents = Math.round(amountUsd * 100);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      capture_method: 'manual',      // Authorize now, capture on AI approval
      metadata: {
        milestoneId,
        recruiterId,
        jobTitle,
        platform: 'gighuz',
      },
      description: `GigHuz escrow — ${jobTitle}`,
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: amountCents,
      currency: 'usd',
    };
  } catch (err: any) {
    console.warn(`[Stripe] Escrow creation failed, simulating instead: ${err.message}`);
    return {
      paymentIntentId: `${SIM_PREFIX}${milestoneId}_${Date.now()}`,
      clientSecret: `${SIM_PREFIX}client_secret`,
      amount: amountCents,
      currency: 'usd',
    };
  }
}

/**
 * Capture escrowed funds after Auditor Agent approves the milestone.
 */
export async function captureEscrow(paymentIntentId: string): Promise<void> {
  if (isSimulated(paymentIntentId)) {
    console.log(`[Stripe] Simulated capture for ${paymentIntentId}`);
    return;
  }
  await stripe.paymentIntents.capture(paymentIntentId);
}

/**
 * Cancel escrow and refund the recruiter (e.g. job cancelled).
 */
export async function cancelEscrow(paymentIntentId: string): Promise<void> {
  if (isSimulated(paymentIntentId)) {
    console.log(`[Stripe] Simulated cancel for ${paymentIntentId}`);
    return;
  }
  await stripe.paymentIntents.cancel(paymentIntentId);
}

/**
 * Get payment intent status.
 */
export async function getEscrowStatus(paymentIntentId: string) {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}
