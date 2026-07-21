import Stripe from 'stripe';
import { EscrowFundResult } from '../types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export { stripe };

/**
 * Create a payment intent to hold funds in escrow for a milestone.
 * Funds are NOT captured until milestone is approved by the Auditor Agent.
 */
export async function createMilestoneEscrow(
  milestoneId: string,
  amountUsd: number,
  recruiterId: string,
  jobTitle: string
): Promise<EscrowFundResult> {
  const amountCents = Math.round(amountUsd * 100);

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
}

/**
 * Capture escrowed funds after Auditor Agent approves the milestone.
 */
export async function captureEscrow(paymentIntentId: string): Promise<void> {
  await stripe.paymentIntents.capture(paymentIntentId);
}

/**
 * Cancel escrow and refund the recruiter (e.g. job cancelled).
 */
export async function cancelEscrow(paymentIntentId: string): Promise<void> {
  await stripe.paymentIntents.cancel(paymentIntentId);
}

/**
 * Get payment intent status.
 */
export async function getEscrowStatus(paymentIntentId: string) {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}
