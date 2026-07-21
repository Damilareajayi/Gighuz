'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { Upload, CheckCircle, AlertTriangle, Clock, Zap, X } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { api } from '@/lib/api';
import { Submission, MilestoneInstance } from '@/lib/types';

function AuditBadge({ status }: { status: string }) {
  if (status === 'pending') return (
    <div className="flex items-center gap-1.5 text-xs text-orange-600">
      <Zap size={12} className="animate-pulse" /> AI Auditing...
    </div>
  );
  if (status === 'pass') return (
    <div className="flex items-center gap-1.5 text-xs text-teal-700 font-semibold">
      <CheckCircle size={12} /> Passed
    </div>
  );
  if (status === 'flag') return (
    <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold">
      <AlertTriangle size={12} /> Needs Revision
    </div>
  );
  return <span className="text-xs text-gray-500">{status}</span>;
}

function SubmitForm({ milestones, onClose, onSubmitted }: {
  milestones: MilestoneInstance[]; onClose: () => void; onSubmitted: () => void;
}) {
  const [milestoneId, setMilestoneId] = useState(milestones[0]?.id || '');
  const [deliverableType, setDeliverableType] = useState<'code' | 'writing' | 'design' | 'data' | 'other'>('code');
  const [notes, setNotes] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function addFile() {
    if (!fileUrl.trim()) return;
    setFiles(f => [...f, fileUrl.trim()]);
    setFileUrl('');
  }

  async function handleSubmit() {
    if (!milestoneId || files.length === 0) return;
    setLoading(true);
    setError('');
    try {
      await api.submit({
        milestoneId,
        deliverableType,
        notes,
        files: files.map((url, i) => ({ name: `file-${i + 1}`, url, type: 'link', sizeBytes: 0 })),
      });
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">New Submission</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Milestone</label>
          <select className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
            value={milestoneId} onChange={e => setMilestoneId(e.target.value)}>
            {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Deliverable Type</label>
          <select className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
            value={deliverableType} onChange={e => setDeliverableType(e.target.value as any)}>
            <option value="code">Code</option>
            <option value="writing">Writing</option>
            <option value="design">Design</option>
            <option value="data">Data</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Notes to Auditor</label>
          <textarea className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500 resize-none h-24"
            placeholder="Describe what you've submitted and how it meets the acceptance criteria..."
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">File / Link URLs</label>
          <div className="flex gap-2">
            <input className="flex-1 border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
              placeholder="https://github.com/you/repo or Google Doc link"
              value={fileUrl} onChange={e => setFileUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFile()} />
            <button onClick={addFile} className="btn-outline text-xs px-3">Add</button>
          </div>
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-50 border border-surface-border rounded px-2 py-1.5">
                  <span className="truncate">{f}</span>
                  <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))}><X size={12} className="text-gray-400" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button onClick={handleSubmit} disabled={!milestoneId || files.length === 0 || loading} className="btn-primary w-full">
          {loading ? 'Submitting…' : 'Submit for AI Audit'}
        </button>
      </div>
    </div>
  );
}

function SubmissionsContent() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [milestones, setMilestones] = useState<MilestoneInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSubmit, setShowSubmit] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([api.listSubmissions(), api.listMilestones()])
      .then(([subs, ms]: any) => { setSubmissions(subs); setMilestones(ms); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const submittableMilestones = milestones.filter(m => ['pending', 'in_progress', 'flagged'].includes(m.status));

  return (
    <div className="flex min-h-screen">
      <Sidebar role="freelancer" />
      <main className="ml-56 flex-1 p-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Submissions</h1>
            <p className="text-sm text-gray-500 mt-0.5">Submit work — AI audits before client delivery</p>
          </div>
          <button onClick={() => setShowSubmit(true)} disabled={submittableMilestones.length === 0} className="btn-primary flex items-center gap-2">
            <Upload size={14} /> Submit Work
          </button>
        </div>

        <div className="card border-orange-600/20 bg-orange-50/50">
          <p className="text-xs font-semibold text-orange-600 mb-2">How the AI Audit works</p>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span>1. You submit files + notes</span>
            <span className="text-gray-300">→</span>
            <span>2. Auditor Agent reviews against milestone criteria</span>
            <span className="text-gray-300">→</span>
            <span>3. PASS → delivered to client, payout triggered</span>
          </div>
        </div>

        {showSubmit && (
          submittableMilestones.length > 0
            ? <SubmitForm milestones={submittableMilestones} onClose={() => setShowSubmit(false)} onSubmitted={load} />
            : <p className="text-sm text-gray-500">No active milestones to submit work for.</p>
        )}

        <div className="space-y-3">
          <p className="section-label">Your Submissions</p>

          {loading && <p className="text-sm text-gray-400">Loading…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && submissions.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-sm text-gray-500">No submissions yet.</p>
            </div>
          )}

          {submissions.map((s) => (
            <div key={s.id} className={cn('card border', s.auditResult === 'flag' ? 'border-red-200' : s.auditResult === 'pass' ? 'border-teal-200' : 'border-surface-border')}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">{s.deliverableType}</p>
                  </div>
                  <AuditBadge status={s.auditResult} />
                  {s.auditFeedback && (
                    <div className={cn('mt-2 text-xs p-2 rounded', s.auditResult === 'flag' ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700')}>
                      {s.auditFeedback}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={11} /> {timeAgo(s.submittedAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}

export default function SubmissionsPage() {
  return (
    <RequireAuth role="freelancer">
      <SubmissionsContent />
    </RequireAuth>
  );
}
