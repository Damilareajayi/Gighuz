'use client';
import { useEffect, useState } from 'react';
import { Plus, ChevronRight, Globe, Bot, Users, DollarSign } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { statusClass, statusLabel, formatCurrency, timeAgo } from '@/lib/utils';
import { api } from '@/lib/api';
import { Job, Freelancer, AgentListing, MilestoneInstance } from '@/lib/types';

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

function AssignWorkerPanel({ job, onAssigned }: { job: Job; onAssigned: () => void }) {
  const [tab, setTab] = useState<'human' | 'agent'>('human');
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [agents, setAgents] = useState<AgentListing[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listFreelancers().then((data: any) => setFreelancers(data)).catch(() => {});
    api.listAgentListings().then((data: any) => setAgents(data)).catch(() => {});
  }, []);

  const matched = freelancers.filter(f => job.matchedCandidateIds.includes(f.id));
  const candidates = matched.length > 0 ? matched : freelancers;

  async function assign(body: { freelancerId: string } | { agentListingId: string }) {
    setBusy(true);
    setError('');
    try {
      await api.assignJob(job.id, body);
      onAssigned();
    } catch (err: any) {
      setError(err.message || 'Failed to assign');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-surface-border">
      <div className="flex gap-2 mb-3">
        <button onClick={() => setTab('human')}
          className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${tab === 'human' ? 'border-teal-700 bg-teal-50 text-teal-700 font-semibold' : 'border-surface-border text-gray-500'}`}>
          <Users size={12} /> Human Freelancer
        </button>
        <button onClick={() => setTab('agent')}
          className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${tab === 'agent' ? 'border-orange-600 bg-orange-50 text-orange-600 font-semibold' : 'border-surface-border text-gray-500'}`}>
          <Bot size={12} /> AI Agent
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {tab === 'human' ? (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {candidates.length === 0 && <p className="text-xs text-gray-400">No freelancers available yet.</p>}
          {candidates.map(f => (
            <div key={f.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
              <span>{f.name} · {f.country} · ⭐ {f.averageRating}</span>
              <button disabled={busy} onClick={() => assign({ freelancerId: f.id })} className="btn-primary text-xs px-2.5 py-1">Assign</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {agents.length === 0 && <p className="text-xs text-gray-400">No agents in the catalog yet.</p>}
          {agents.map(a => (
            <div key={a.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
              <span>{a.name} · {formatCurrency(a.pricePerTaskUsd)}/task · {a.completedTasks} completed</span>
              <button disabled={busy} onClick={() => assign({ agentListingId: a.id })} className="btn-primary text-xs px-2.5 py-1">Assign</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({ job, milestones, onChanged }: { job: Job; milestones: MilestoneInstance[]; onChanged: () => void }) {
  const [showAssign, setShowAssign] = useState(false);
  const [fundingId, setFundingId] = useState<string | null>(null);
  const isAssigned = Boolean(job.assignedFreelancerId || job.assignedAgentListingId);
  const canAssign = ['structured', 'matched'].includes(job.status) && !isAssigned;

  async function fundMilestone(templateId: string) {
    setFundingId(templateId);
    try {
      await api.createMilestone({
        jobId: job.id,
        milestoneTemplateId: templateId,
        ...(job.assignedAgentListingId ? { agentListingId: job.assignedAgentListingId } : { freelancerId: job.assignedFreelancerId }),
      });
      onChanged();
    } catch {
      // surfaced via the milestone list not updating; kept lightweight for MVP
    } finally {
      setFundingId(null);
    }
  }

  return (
    <div className="card-hover animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={statusClass(job.status)}>{statusLabel(job.status)}</span>
            {job.source === 'scraped' && (
              <span className="flex items-center gap-1 badge badge-orange">
                <Globe size={10} /> Aggregated
              </span>
            )}
            {job.assignedAgentListingId && (
              <span className="flex items-center gap-1 badge badge-orange"><Bot size={10} /> AI Agent assigned</span>
            )}
            {job.assignedFreelancerId && (
              <span className="flex items-center gap-1 badge badge-teal"><Users size={10} /> Freelancer assigned</span>
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
            <div className="mt-3 space-y-1.5">
              {job.structuredMilestones.map(m => {
                const instance = milestones.find(mi => mi.milestoneTemplateId === m.id);
                return (
                  <div key={m.id} className="flex items-center justify-between text-xs bg-teal-50 text-teal-700 px-2.5 py-1.5 rounded-lg border border-teal-100">
                    <span>{m.name} · {formatCurrency(m.paymentAmountUsd)}</span>
                    {instance ? (
                      <span className={statusClass(instance.status)}>{statusLabel(instance.status)}</span>
                    ) : isAssigned ? (
                      <button onClick={() => fundMilestone(m.id)} disabled={fundingId === m.id}
                        className="flex items-center gap-1 text-teal-700 font-semibold hover:text-teal-800">
                        <DollarSign size={11} /> {fundingId === m.id ? 'Funding…' : 'Fund'}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {job.status === 'structured' && (
            <button
              onClick={async () => { await api.matchJob(job.id); onChanged(); }}
              className="btn-outline text-xs mt-3">
              Find matching talent
            </button>
          )}

          {canAssign && (
            <button onClick={() => setShowAssign(s => !s)} className="btn-outline text-xs mt-3 ml-2">
              {showAssign ? 'Hide' : 'Assign Worker'}
            </button>
          )}

          {showAssign && canAssign && <AssignWorkerPanel job={job} onAssigned={() => { setShowAssign(false); onChanged(); }} />}
        </div>
        <ChevronRight size={18} className="text-gray-300 shrink-0 mt-1" />
      </div>
    </div>
  );
}

function JobsContent() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [milestones, setMilestones] = useState<MilestoneInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  function loadAll() {
    setLoading(true);
    Promise.all([api.listJobs(), api.listMilestones()])
      .then(([j, m]: any) => { setJobs(j); setMilestones(m); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="recruiter" />
      <main className="md:ml-56 flex-1 px-4 md:px-6 pt-20 md:pt-6 pb-24 md:pb-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">My Jobs</h1>
            <p className="text-base text-gray-500 mt-1">All jobs posted, AI-structured, and matched to the right agent</p>
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
            <JobCard key={job.id} job={job} milestones={milestones.filter(m => m.jobId === job.id)} onChanged={loadAll} />
          ))}
        </div>

        {showModal && <PostJobModal onClose={() => { setShowModal(false); loadAll(); }} onPosted={loadAll} />}
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
