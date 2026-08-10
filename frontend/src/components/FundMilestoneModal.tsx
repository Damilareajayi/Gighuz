'use client';
import { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock } from 'lucide-react';
import { getStripe } from '@/lib/stripe';
import { api } from '@/lib/api';
import { friendlyError } from '@/lib/errors';
import { ErrorBanner } from './ErrorBanner';
import { formatCurrency } from '@/lib/utils';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '14px',
      color: '#1F2937',
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      '::placeholder': { color: '#9CA3AF' },
    },
    invalid: { color: '#DC2626' },
  },
};

function ModalShell({ amount, children }: { amount: number; children: React.ReactNode }) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Fund this milestone</p>
          <p className="text-xs text-gray-400 mt-0.5">Your card is authorized now, only charged once the work passes audit.</p>
        </div>
        <p className="text-lg font-bold text-teal-700">{formatCurrency(amount)}</p>
      </div>
      {children}
    </div>
  );
}

// Real Stripe path — clientSecret is a genuine PaymentIntent client secret,
// so this collects a real card and authorizes it (manual capture, not
// charged until the Deliverable Auditor passes the work).
function StripeCheckoutForm({ clientSecret, milestoneId, amount, onClose, onFunded }: {
  clientSecret: string; milestoneId: string; amount: number; onClose: () => void; onFunded: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError('');
    try {
      const card = elements.getElement(CardElement);
      if (!card) throw new Error('Card details not ready — try again.');

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });

      if (stripeError) {
        setError(friendlyError(new Error(stripeError.message), 'Your card was declined — try a different card.'));
        return;
      }
      if (paymentIntent?.status !== 'requires_capture' && paymentIntent?.status !== 'succeeded') {
        setError(`Payment isn't confirmed yet (status: ${paymentIntent?.status}) — try again.`);
        return;
      }

      await api.confirmMilestone(milestoneId);
      onFunded();
      onClose();
    } catch (err: any) {
      setError(friendlyError(err, 'Could not confirm payment — try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell amount={amount}>
      <div className="border border-surface-border rounded-xl px-3.5 py-3">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      {error && <ErrorBanner message={error} />}
      <button onClick={handleSubmit} disabled={submitting || !stripe} className="btn-primary w-full flex items-center justify-center gap-2">
        <Lock size={14} /> {submitting ? 'Authorizing…' : `Authorize ${formatCurrency(amount)}`}
      </button>
      <button onClick={onClose} disabled={submitting} className="btn-outline w-full">Cancel</button>
    </ModalShell>
  );
}

// Fallback path — the backend fell back to a simulated escrow (no real
// Stripe key configured in this environment), so there's no real
// PaymentIntent to confirm against. Just activates the milestone directly.
function SimulatedFundForm({ milestoneId, amount, onClose, onFunded }: {
  milestoneId: string; amount: number; onClose: () => void; onFunded: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      await api.confirmMilestone(milestoneId);
      onFunded();
      onClose();
    } catch (err: any) {
      setError(friendlyError(err, 'Could not fund this milestone — try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell amount={amount}>
      <div className="rounded-xl border border-orange-100 bg-orange-50/60 px-3.5 py-3 text-xs text-orange-700">
        Stripe isn't fully configured on this environment — this milestone will be funded with a simulated escrow instead of a real charge.
      </div>
      {error && <ErrorBanner message={error} />}
      <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
        <Lock size={14} /> {submitting ? 'Funding…' : 'Fund (simulated)'}
      </button>
      <button onClick={onClose} disabled={submitting} className="btn-outline w-full">Cancel</button>
    </ModalShell>
  );
}

export function FundMilestoneModal({ clientSecret, milestoneId, amount, onClose, onFunded }: {
  clientSecret: string; milestoneId: string; amount: number; onClose: () => void; onFunded: () => void;
}) {
  const isSimulated = clientSecret.startsWith('sim_');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {isSimulated ? (
          <SimulatedFundForm milestoneId={milestoneId} amount={amount} onClose={onClose} onFunded={onFunded} />
        ) : (
          <Elements stripe={getStripe()} options={{ clientSecret }}>
            <StripeCheckoutForm clientSecret={clientSecret} milestoneId={milestoneId} amount={amount} onClose={onClose} onFunded={onFunded} />
          </Elements>
        )}
      </div>
    </div>
  );
}
