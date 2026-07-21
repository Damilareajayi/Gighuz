'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { DollarSign, Lock, CheckCircle, ArrowRight, Globe } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { MilestoneInstance } from '@/lib/types';
import { useAuth } from '@/lib/auth';

function MilestoneRow({ m }: { m: MilestoneInstance }) {
  const isPaid     = m.status === 'paid';
  const isFlagged  = m.status === 'flagged';
  const inEscrow   = ['pending', 'in_progress', 'submitted', 'auditing'].includes(m.status);

  return (
    <div className={cn('card border', isPaid ? 'border-surface-border opacity-70' : isFlagged ? 'border-red-200' : 'border-surface-border')}>
      <div className="flex items-center gap-4">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          isPaid ? 'bg-gray-100' : isFlagged ? 'bg-red-50' : 'bg-orange-50')}>
          {isPaid && <CheckCircle size={16} className="text-gray-400" />}
          {isFlagged && <Lock size={16} className="text-red-500" />}
          {inEscrow && <Lock size={16} className="text-orange-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{m.name}</p>
          {m.paidAt && <p className="text-xs text-gray-400 mt-0.5">Paid {new Date(m.paidAt).toLocaleDateString()}</p>}
          {(m.paystackTransferCode || m.flutterwaveTransferId) && (
            <p className="text-xs text-gray-400">Ref: {m.paystackTransferCode || m.flutterwaveTransferId}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={cn('text-base font-bold tabular-nums', isPaid ? 'text-gray-400' : isFlagged ? 'text-red-600' : 'text-orange-600')}>
            {formatCurrency(m.paymentAmountUsd)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">{m.status.replace('_', ' ')}</p>
        </div>
      </div>
    </div>
  );
}

function PaymentsContent() {
  const { profile } = useAuth();
  const [milestones, setMilestones] = useState<MilestoneInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listMilestones()
      .then((data: any) => setMilestones(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const total    = milestones.filter((m) => m.status === 'paid').reduce((s, m) => s + m.paymentAmountUsd, 0);
  const pending  = milestones.filter((m) => m.status === 'submitted' || m.status === 'auditing').reduce((s, m) => s + m.paymentAmountUsd, 0);
  const escrowed = milestones.filter((m) => m.status === 'pending' || m.status === 'in_progress').reduce((s, m) => s + m.paymentAmountUsd, 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile?.role === 'recruiter' ? 'recruiter' : 'freelancer'} />
      <main className="ml-56 flex-1 p-6 space-y-6">

        <div>
          <h1 className="text-xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Secure escrow → AI approval → instant local payout</p>
        </div>

        <div className="card border-orange-600/20 bg-orange-50/50">
          <p className="text-xs font-semibold text-orange-600 mb-3">How GigHuz Payments Work</p>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                <DollarSign size={14} className="text-teal-700" />
              </div>
              <p className="text-gray-500 text-center w-16">Client pays Stripe escrow</p>
            </div>
            <ArrowRight size={12} className="text-gray-300 shrink-0" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                <Lock size={14} className="text-orange-600" />
              </div>
              <p className="text-gray-500 text-center w-16">Funds held secure</p>
            </div>
            <ArrowRight size={12} className="text-gray-300 shrink-0" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                <CheckCircle size={14} className="text-teal-700" />
              </div>
              <p className="text-gray-500 text-center w-16">AI auditor approves</p>
            </div>
            <ArrowRight size={12} className="text-gray-300 shrink-0" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                <Globe size={14} className="text-teal-700" />
              </div>
              <p className="text-gray-500 text-center w-20">Paystack/Flutterwave instant payout</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="card">
            <p className="text-xs text-gray-500 mb-1">Total {profile?.role === 'recruiter' ? 'Paid' : 'Earned'}</p>
            <p className="text-2xl font-bold text-teal-700">{formatCurrency(total)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500 mb-1">Pending Payout</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(pending)}</p>
            <p className="text-xs text-gray-400 mt-1">AI auditing in progress</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500 mb-1">In Escrow</p>
            <p className="text-2xl font-bold text-gray-700">{formatCurrency(escrowed)}</p>
            <p className="text-xs text-gray-400 mt-1">Secured, awaiting work</p>
          </div>
        </div>

        <div>
          <p className="section-label mb-3">Milestones</p>

          {loading && <p className="text-sm text-gray-400">Loading…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && milestones.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-sm text-gray-500">No milestones yet.</p>
            </div>
          )}

          <div className="space-y-3">
            {milestones.map((m) => <MilestoneRow key={m.id} m={m} />)}
          </div>
        </div>

      </main>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <RequireAuth>
      <PaymentsContent />
    </RequireAuth>
  );
}
