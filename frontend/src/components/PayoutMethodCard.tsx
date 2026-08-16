'use client';
import { useState } from 'react';
import { Wallet, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { friendlyError } from '@/lib/errors';
import { ErrorBanner } from './ErrorBanner';

const CURRENCIES = ['USD', 'NGN', 'GHS', 'KES', 'ZAR', 'UGX', 'TZS', 'GBP', 'EUR'];

export interface PayoutMethodFields {
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  currency?: string;
  paystackRecipientCode?: string;
}

function maskAccount(accountNumber?: string) {
  if (!accountNumber) return '';
  const tail = accountNumber.slice(-4);
  return `•••• ${tail}`;
}

export function PayoutMethodCard({ country, initial, onSaved }: {
  country: string;
  initial: PayoutMethodFields;
  onSaved: (fields: PayoutMethodFields) => void;
}) {
  const hasMethod = Boolean(initial.bankCode && initial.accountNumber);
  const [editing, setEditing] = useState(!hasMethod);
  const [bankCode, setBankCode] = useState(initial.bankCode || '');
  const [accountNumber, setAccountNumber] = useState(initial.accountNumber || '');
  const [accountName, setAccountName] = useState(initial.accountName || '');
  const [currency, setCurrency] = useState(initial.currency || (country === 'NG' ? 'NGN' : 'USD'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const valid = bankCode.trim().length > 0 && accountNumber.trim().length >= 4 && accountName.trim().length >= 2;

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const result = await api.savePayoutMethod({ bankCode, accountNumber, accountName, currency }) as { paystackLinked: boolean };
      onSaved({ bankCode, accountNumber, accountName, currency, paystackRecipientCode: result.paystackLinked ? 'linked' : undefined });
      setEditing(false);
    } catch (err: any) {
      setError(friendlyError(err, 'Could not save your payout details — try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="section-label flex items-center gap-1.5"><Wallet size={13} /> Payout Method</p>
        {hasMethod && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs font-medium text-teal-700 hover:text-teal-800">Edit</button>
        )}
      </div>

      {!editing && hasMethod && (
        <div className="flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50/60 px-3.5 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-teal-600" /> {initial.accountName}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{maskAccount(initial.accountNumber)} · Bank {initial.bankCode} · {initial.currency}</p>
          </div>
          {initial.paystackRecipientCode && (
            <span className="flex items-center gap-1 text-xs text-teal-700"><ShieldCheck size={12} /> Verified</span>
          )}
        </div>
      )}

      {!editing && !hasMethod && (
        <div className="rounded-xl border border-orange-100 bg-orange-50/60 px-3.5 py-3 text-xs text-orange-700">
          You haven't set up a payout method yet — add your bank details so completed work can actually pay out.
        </div>
      )}

      {editing && (
        <div className="space-y-2.5">
          <p className="text-xs text-gray-400">
            {country === 'NG' ? 'Nigerian accounts get instant Paystack payouts.' : 'Payouts route through Flutterwave for your region.'}
          </p>
          <input className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
            placeholder="Account holder name" value={accountName} onChange={e => setAccountName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2.5">
            <input className="border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
              placeholder="Bank code" value={bankCode} onChange={e => setBankCode(e.target.value)} />
            <input className="border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
              placeholder="Account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
          </div>
          <select className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
            value={currency} onChange={e => setCurrency(e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {error && <ErrorBanner message={error} />}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!valid || saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Save Payout Method'}
            </button>
            {hasMethod && (
              <button onClick={() => setEditing(false)} disabled={saving} className="btn-outline">Cancel</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
