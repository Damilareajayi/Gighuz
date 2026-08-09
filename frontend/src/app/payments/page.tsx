'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { DollarSign, Lock, CheckCircle, ArrowRight, Globe, MessageSquarePlus, ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { MilestoneInstance, ChangeRequest } from '@/lib/types';
import { useAuth } from '@/lib/auth';

function ChangeRequestRow({ cr }: { cr: ChangeRequest }) {
  const inScope = cr.verdict === 'in_scope';
  return (
    <div className={cn('rounded-lg p-3 border text-xs', inScope ? 'border-teal-100 bg-teal-50/50' : 'border-orange-100 bg-orange-50/50')}>
      <p className="text-gray-700 mb-1.5">{cr.description}</p>
      <div className={cn('flex items-center gap-1.5 font-semibold', inScope ? 'text-teal-700' : 'text-orange-600')}>
        {inScope ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
        {inScope ? 'Free revision — within original scope' : `New work — suggested +${formatCurrency(cr.suggestedAdditionalAmountUsd || 0)}`}
      </div>
      {cr.reasoning && <p className="text-gray-500 mt-1">{cr.reasoning}</p>}
    </div>
  );
}

function MilestoneRow({ m, isRecruiter }: { m: MilestoneInstance; isRecruiter: boolean }) {
  const isPaid     = m.status === 'paid';
  const isFlagged  = m.status === 'flagged';
  const inEscrow   = ['pending', 'in_progress', 'submitted', 'auditing'].includes(m.status);
  const canRequestChange = isRecruiter && ['in_progress', 'submitted', 'auditing'].includes(m.status);

  const [expanded, setExpanded] = useState(false);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loadedRequests, setLoadedRequests] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next && !loadedRequests) {
      try {
        const data = await api.listChangeRequests(m.id) as ChangeRequest[];
        setChangeRequests(data);
      } catch { /* non-critical */ }
      setLoadedRequests(true);
    }
  }

  async function handleSubmitChange() {
    if (description.trim().length < 10) return;
    setSubmitting(true);
    setError('');
    try {
      const cr = await api.requestChange(m.id, description) as ChangeRequest;
      setChangeRequests(prev => [cr, ...prev]);
      setDescription('');
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to submit change request');
    } finally {
      setSubmitting(false);
    }
  }

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

      {(canRequestChange || !isPaid) && (
        <button onClick={toggleExpanded} className="text-xs text-gray-400 hover:text-teal-700 mt-2 flex items-center gap-1">
          <MessageSquarePlus size={11} /> {expanded ? 'Hide' : 'Changes'} {changeRequests.length > 0 && `(${changeRequests.length})`}
        </button>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-surface-border space-y-2">
          {changeRequests.map(cr => <ChangeRequestRow key={cr.id} cr={cr} />)}
          {changeRequests.length === 0 && <p className="text-xs text-gray-400">No change requests yet.</p>}

          {canRequestChange && (
            showForm ? (
              <div className="space-y-2 pt-1">
                <textarea className="w-full border border-surface-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-teal-500 resize-none h-16"
                  placeholder="Describe the change you need — the Scope Guard Agent will rule whether it's covered by the original milestone or needs its own payment."
                  value={description} onChange={e => setDescription(e.target.value)} />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={handleSubmitChange} disabled={submitting || description.trim().length < 10} className="btn-primary text-xs px-3 py-1.5">
                    {submitting ? 'Checking scope…' : 'Submit for scope check'}
                  </button>
                  <button onClick={() => setShowForm(false)} className="btn-outline text-xs px-3 py-1.5">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowForm(true)} className="btn-outline text-xs px-3 py-1.5">Request a change</button>
            )
          )}
        </div>
      )}
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
  const isRecruiter = profile?.role === 'recruiter';
  const sidebarRole = profile?.role === 'recruiter' ? 'recruiter' : profile?.role === 'agent_developer' ? 'agent_developer' : 'freelancer';

  return (
    <div className="flex min-h-screen">
      <Sidebar role={sidebarRole} />
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
            <p className="text-xs text-gray-500 mb-1">Total {isRecruiter ? 'Paid' : 'Earned'}</p>
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
            {milestones.map((m) => <MilestoneRow key={m.id} m={m} isRecruiter={isRecruiter} />)}
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
