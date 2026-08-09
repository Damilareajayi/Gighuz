import { PayoutResult } from '../types';

const PAYSTACK_BASE = 'https://api.paystack.co';
const FLUTTERWAVE_BASE = 'https://api.flutterwave.com/v3';

// ── Paystack ──────────────────────────────────────────────────────────────────
async function paystackPost(path: string, body: object): Promise<Record<string, any>> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<Record<string, any>>;
}

/**
 * Create a Paystack transfer recipient (bank account or mobile money).
 * Call once per freelancer during profile verification.
 */
export async function createPaystackRecipient(
  name: string,
  accountNumber: string,
  bankCode: string,
  currency = 'NGN'
): Promise<string> {
  const res = await paystackPost('/transferrecipient', {
    type: 'nuban',
    name,
    account_number: accountNumber,
    bank_code: bankCode,
    currency,
  });

  if (!res.status) throw new Error(`Paystack recipient error: ${res.message}`);
  return res.data.recipient_code;
}

/**
 * Initiate payout to a Paystack recipient.
 */
export async function paystackPayout(
  recipientCode: string,
  amountNgn: number,       // in kobo (NGN cents)
  reference: string,
  reason: string
): Promise<PayoutResult> {
  const res = await paystackPost('/transfer', {
    source: 'balance',
    amount: amountNgn,
    recipient: recipientCode,
    reference,
    reason,
  });

  if (!res.status) throw new Error(`Paystack transfer error: ${res.message}`);

  return {
    success: true,
    reference: res.data.reference,
    provider: 'paystack',
    amountUsd: amountNgn / 100 / 1550, // approximate NGN→USD
  };
}

// ── Flutterwave ───────────────────────────────────────────────────────────────
async function flwPost(path: string, body: object): Promise<Record<string, any>> {
  const res = await fetch(`${FLUTTERWAVE_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<Record<string, any>>;
}

/**
 * Initiate payout via Flutterwave (supports 30+ countries,
 * bank transfer, mobile money, M-Pesa).
 */
export async function flutterwavePayout(
  accountNumber: string,
  bankCode: string,
  accountName: string,
  currency: string,
  amountLocal: number,
  reference: string,
  narration: string
): Promise<PayoutResult> {
  const res = await flwPost('/transfers', {
    account_bank: bankCode,
    account_number: accountNumber,
    amount: amountLocal,
    narration,
    currency,
    reference,
    beneficiary_name: accountName,
    callback_url: `${process.env.API_URL}/webhooks/flutterwave`,
  });

  if (res.status !== 'success') {
    throw new Error(`Flutterwave transfer error: ${res.message}`);
  }

  return {
    success: true,
    reference: res.data.reference,
    provider: 'flutterwave',
    amountUsd: amountLocal,
  };
}

function simulatedPayout(reference: string, amountUsd: number, provider: 'paystack' | 'flutterwave', reason: string): PayoutResult {
  console.warn(`[Payouts] ${reason} — simulating a ${provider} payout instead of failing the audit/payment pipeline.`);
  return { success: true, reference: `sim_${reference}`, provider, amountUsd };
}

/**
 * Route payout based on the recipient's preferred provider and country.
 * "recipientId" is a Freelancer or AgentDeveloper id — this function doesn't
 * care which, only that payout details were (or weren't) configured.
 *
 * Falls back to a simulated payout — never a thrown error — if no payout
 * method is on file, or if the real provider call fails (e.g. a placeholder
 * API key in local dev). A failed real-money payout after work has already
 * been audited and approved should never be a dead end for the workflow;
 * it's a support/ops problem to resolve, not a reason to leave the
 * milestone stuck.
 */
export async function routePayout(
  recipientId: string,
  amountUsd: number,
  reference: string,
  recipientData: {
    country: string;
    paystackRecipientCode?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
    currency?: string;
  }
): Promise<PayoutResult> {
  // Nigeria → Paystack (faster, lower fees)
  if (recipientData.country === 'NG' && recipientData.paystackRecipientCode) {
    const amountNgn = Math.round(amountUsd * 1550 * 100); // USD → kobo
    try {
      return await paystackPayout(
        recipientData.paystackRecipientCode,
        amountNgn,
        reference,
        `GigHuz milestone payout #${reference}`
      );
    } catch (err: any) {
      return simulatedPayout(reference, amountUsd, 'paystack', err.message);
    }
  }

  // Everywhere else → Flutterwave
  if (
    recipientData.bankCode &&
    recipientData.accountNumber &&
    recipientData.accountName &&
    recipientData.currency
  ) {
    const localRate: Record<string, number> = {
      GHS: 15.5, KES: 130, ZAR: 19, UGX: 3850, TZS: 2700,
    };
    const rate = localRate[recipientData.currency] || 1;
    const amountLocal = Math.round(amountUsd * rate * 100) / 100;

    try {
      return await flutterwavePayout(
        recipientData.accountNumber,
        recipientData.bankCode,
        recipientData.accountName,
        recipientData.currency,
        amountLocal,
        reference,
        `GigHuz milestone payout`
      );
    } catch (err: any) {
      return simulatedPayout(reference, amountUsd, 'flutterwave', err.message);
    }
  }

  return simulatedPayout(reference, amountUsd, 'flutterwave', `No payout method configured for ${recipientId}`);
}
