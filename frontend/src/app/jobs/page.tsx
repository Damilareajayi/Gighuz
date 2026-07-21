'use client';
import { useEffect, useState } from 'react';
import { Plus, ChevronRight, Globe } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { statusClass, statusLabel, formatCurrency, timeAgo } from '@/lib/utils';
import { api } from '@/lib/api';
import { Job } from '@/lib/types';

function PostJobModal({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      await api.postJob({ descriptionRaw: description, source: 'direct' });
      setSubmitted(true);
      onPosted();
    } catch (err: any) {
      setError(err.message || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Post a Job</h2>
            <p className="text-xs text-gray-400 mt-0.5">AI agents will structure and match automatically</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Job Posted!</h3>
            <p className="text-sm text-gray-500 mb-1">The Structuring Agent is parsing your description.</p>
            <p className="text-sm text-gray-500">Refresh in a moment to see milestones and matched talent.</p>
            <button onClick={onClose} className="btn-primary mt-5">Close</button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Job Description</label>
              <textarea className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500 resize-none"
                rows={7} placeholder="Describe exactly what you need, your tech stack, deliverables, budget expectations, and any constraints (min 50 characters)..."
                value={description} onChange={e => setDescription(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">
                The AI Structuring Agent will extract a title, milestones, skills, and budget from this description. {description.length}/50 min chars.
              </p>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button onClick={handleSubmit} disabled={description.length < 50 || loading} className="btn-primary w-full">
              {loading ? 'Submitting to AI agents...' : 'Post Job & Start AI Structuring'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function JobsContent() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  function loadJobs() {
    setLoading(true);
    api.listJobs()
      .then((data: any) => setJobs(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(loadJobs, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="recruiter" />
      <main className="ml-56 flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Jobs</h1>
            <p className="text-sm text-gray-500 mt-0.5">All jobs posted · AI-structured · talent matched</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Post a Job
          </button>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading jobs…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && jobs.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-sm text-gray-500">You haven't posted any jobs yet.</p>
          </div>
        )}

        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="card-hover cursor-pointer animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={statusClass(job.status)}>{statusLabel(job.status)}</span>
                    {job.source === 'scraped' && (
                      <span className="flex items-center gap-1 badge badge-orange">
                        <Globe size={10} /> Aggregated
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">{job.title || 'Untitled job (structuring in progress)'}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                    <span>{formatCurrency(job.budgetMinUsd)}–{formatCurrency(job.budgetMaxUsd)}</span>
                    <span className="text-gray-200">·</span>
                    <span>{job.timelineDays} day timeline</span>
                    <span className="text-gray-200">·</span>
                    <span>{job.structuredMilestones.length} milestones</span>
                    <span className="text-gray-200">·</span>
                    <span>{job.matchedCandidateIds.length} candidates matched</span>
                    <span className="text-gray-200">·</span>
                    <span>{timeAgo(job.createdAt)}</span>
                  </div>
                  <div className="flex gap-1.5 mt-2.5 flex-wrap">
                    {job.skillsRequired.map(s => (
                      <span key={s} className="text-xs bg-gray-50 border border-surface-border text-gray-500 px-2 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                  {job.structuredMilestones.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {job.structuredMilestones.map(m => (
                        <div key={m.id} className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-lg border border-teal-100">
                          {m.name} · {formatCurrency(m.paymentAmountUsd)}
                        </div>
                      ))}
                    </div>
                  )}
                  {job.status === 'structured' && (
                    <button
                      onClick={async () => { await api.matchJob(job.id); loadJobs(); }}
                      className="btn-outline text-xs mt-3">
                      Find matching talent
                    </button>
                  )}
                </div>
                <ChevronRight size={18} className="text-gray-300 shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>

        {showModal && <PostJobModal onClose={() => { setShowModal(false); loadJobs(); }} onPosted={loadJobs} />}
      </main>
    </div>
  );
}

export default function JobsPage() {
  return (
    <RequireAuth role="recruiter">
      <JobsContent />
    </RequireAuth>
  );
}
