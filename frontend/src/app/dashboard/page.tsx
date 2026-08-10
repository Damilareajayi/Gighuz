'use client';
import { useEffect, useState } from 'react';
import { Briefcase, DollarSign, Zap, Users, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { formatCurrency, statusClass, statusLabel, timeAgo } from '@/lib/utils';
import { api } from '@/lib/api';
import { Job } from '@/lib/types';

const STAT_GRADIENTS = {
  teal:   'from-teal-600 to-teal-800',
  orange: 'from-orange-500 to-orange-700',
  dark:   'from-teal-950 to-teal-900',
} as const;

function StatCard({ label, value, sub, icon: Icon, accent = 'teal' }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent?: keyof typeof STAT_GRADIENTS;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-md bg-gradient-to-br ${STAT_GRADIENTS[accent]}`}>
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-white/70 mb-1">{label}</p>
          <p className="text-3xl font-extrabold">{value}</p>
          {sub && <p className="text-sm text-white/60 mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-xl bg-white/15">
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listJobs()
      .then((data: any) => setJobs(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const activeJobs = jobs.filter(j => ['matched', 'in_progress'].includes(j.status)).length;
  const totalBudget = jobs.reduce((sum, j) => sum + (j.budgetMaxUsd || 0), 0);
  const matchedCount = jobs.reduce((sum, j) => sum + j.matchedCandidateIds.length, 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="recruiter" />
      <main className="md:ml-56 flex-1 px-4 md:px-6 pt-20 md:pt-6 pb-24 md:pb-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Client Dashboard</h1>
            <p className="text-base text-gray-500 mt-1">Your AI agents are working around the clock</p>
          </div>
          <Link href="/jobs" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Post a Job
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Active Jobs" value={String(activeJobs)} sub={`${jobs.length} total posted`} icon={Briefcase} accent="teal" />
          <StatCard label="Total Budget" value={formatCurrency(totalBudget)} sub="Across all open jobs" icon={DollarSign} accent="dark" />
          <StatCard label="Candidates Matched" value={String(matchedCount)} sub="By the Matching Agent" icon={Users} accent="orange" />
        </div>

        <div className="card border-teal-700/20 bg-teal-50/50">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} className="text-teal-700" />
            <p className="text-sm font-semibold text-teal-700">How your AI agents work</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600">
            <div className="bg-white rounded-xl p-3.5 border border-teal-100">
              <p className="font-semibold text-gray-800 mb-1">Structuring Agent</p>
              Turns your raw job post into clear, priced milestones.
            </div>
            <div className="bg-white rounded-xl p-3.5 border border-teal-100">
              <p className="font-semibold text-gray-800 mb-1">Matching Agent</p>
              Ranks the best-fit freelancers for each job.
            </div>
            <div className="bg-white rounded-xl p-3.5 border border-teal-100">
              <p className="font-semibold text-gray-800 mb-1">Deliverable Auditor</p>
              Reviews submissions against acceptance criteria.
            </div>
            <div className="bg-white rounded-xl p-3.5 border border-teal-100">
              <p className="font-semibold text-gray-800 mb-1">Comms Agent</p>
              Sends WhatsApp updates at every step.
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Recent Jobs</p>
            <Link href="/jobs" className="btn-ghost text-xs">View all</Link>
          </div>

          {loading && <p className="text-sm text-gray-400">Loading jobs…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && jobs.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-sm text-gray-500">No jobs posted yet.</p>
              <Link href="/jobs" className="btn-primary inline-flex mt-3">Post your first job</Link>
            </div>
          )}

          <div className="space-y-3">
            {jobs.slice(0, 5).map(job => (
              <div key={job.id} className="card-hover cursor-pointer animate-fade-in">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={statusClass(job.status)}>{statusLabel(job.status)}</span>
                      {job.source === 'scraped' && <span className="badge badge-orange">Aggregated</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{job.title || 'Untitled job (structuring in progress)'}</h3>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-gray-400">
                        {formatCurrency(job.budgetMinUsd)}–{formatCurrency(job.budgetMaxUsd)}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{job.timelineDays}d timeline</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{job.matchedCandidateIds.length} matched</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{timeAgo(job.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-sm font-bold text-teal-700">
                      {job.structuredMilestones.length} milestones
                    </span>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth role="recruiter">
      <DashboardContent />
    </RequireAuth>
  );
}
