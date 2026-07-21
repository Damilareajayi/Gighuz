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

/**
 * Route payout based on freelancer's preferred provider and country.
 */
export async function routePayout(
  freelancerId: string,
  amountUsd: number,
  reference: string,
  freelancerData: {
    country: string;
    paystackRecipientCode?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
    currency?: string;
  }
): Promise<PayoutResult> {
  // Nigeria → Paystack (faster, lower fees)
  if (freelancerData.country === 'NG' && freelancerData.paystackRecipientCode) {
    const amountNgn = Math.round(amountUsd * 1550 * 100); // USD → kobo
    return paystackPayout(
      freelancerData.paystackRecipientCode,
      amountNgn,
      reference,
      `GigHuz milestone payout #${reference}`
    );
  }

  // Everywhere else → Flutterwave
  if (
    freelancerData.bankCode &&
    freelancerData.accountNumber &&
    freelancerData.accountName &&
    freelancerData.currency
  ) {
    const localRate: Record<string, number> = {
      GHS: 15.5, KES: 130, ZAR: 19, UGX: 3850, TZS: 2700,
    };
    const rate = localRate[freelancerData.currency] || 1;
    const amountLocal = Math.round(amountUsd * rate * 100) / 100;

    return flutterwavePayout(
      freelancerData.accountNumber,
      freelancerData.bankCode,
      freelancerData.accountName,
      freelancerData.currency,
      amountLocal,
      reference,
      `GigHuz milestone payout`
    );
  }

  throw new Error(`No payout method configured for freelancer ${freelancerId}`);
}
