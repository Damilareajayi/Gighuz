'use client';
import { Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { RequireAuth } from '@/components/RequireAuth';

// Note: the backend does not yet expose a live agent-execution-log endpoint.
// The figures below are illustrative of what each agent does, not a live feed.

const agents = [
  {
    id: 'structuring',
    name: 'Structuring Agent',
    description: 'Parses raw job descriptions into structured milestones with acceptance criteria and payment triggers.',
    status: 'active',
    tasksToday: 3,
    successRate: 97,
    avgRuntime: '8s',
    lastRun: '2 min ago',
    recentLogs: [
      { time: '14:22', event: 'Structured job "Python ETL pipeline" → 3 milestones', status: 'pass' },
      { time: '11:05', event: 'Structured job "React dashboard" → 3 milestones', status: 'pass' },
      { time: '09:30', event: 'Structured job "SEO blog posts" → 2 milestones', status: 'pass' },
    ],
    color: 'teal',
  },
  {
    id: 'matching',
    name: 'Matching Agent',
    description: 'Semantically matches structured jobs to vetted African talent using expertise cluster scoring.',
    status: 'active',
    tasksToday: 2,
    successRate: 100,
    avgRuntime: '12s',
    lastRun: '2 min ago',
    recentLogs: [
      { time: '14:23', event: 'Matched "React dashboard" → Amara (92), Fatima (88), David (81)', status: 'pass' },
      { time: '11:06', event: 'Matched "SEO blog posts" → Kwame (90), Nia (85)', status: 'pass' },
    ],
    color: 'orange',
  },
  {
    id: 'auditor',
    name: 'Deliverable Auditor',
    description: 'Reviews freelancer submissions against acceptance criteria before releasing to the client or triggering payment.',
    status: 'idle',
    tasksToday: 1,
    successRate: 94,
    avgRuntime: '18s',
    lastRun: '3 hours ago',
    recentLogs: [
      { time: '11:40', event: 'Audited "SEO Post 1–5" → PASS · Payment released', status: 'pass' },
    ],
    color: 'teal',
  },
  {
    id: 'comms',
    name: 'Comms Agent',
    description: 'Manages all platform communication autonomously — job alerts, submission feedback, payment confirmations via WhatsApp and email.',
    status: 'active',
    tasksToday: 8,
    successRate: 99,
    avgRuntime: '3s',
    lastRun: '30 sec ago',
    recentLogs: [
      { time: '14:24', event: 'WhatsApp: Notified Amara, Fatima, David of new job match', status: 'pass' },
      { time: '11:41', event: 'WhatsApp: Sent payment confirmation to Kwame ($170)', status: 'pass' },
      { time: '11:40', event: 'WhatsApp: Sent audit feedback to Kwame — PASS', status: 'pass' },
      { time: '09:00', event: 'Deadline reminder: Fatima — "UI Components" due in 2 days', status: 'pass' },
    ],
    color: 'orange',
  },
];

function AgentsContent() {
  return (
    <div className="flex min-h-screen">
      <Sidebar role="recruiter" />
      <main className="ml-56 flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Four Gemini-powered agents run the GigHuz platform autonomously — illustrative overview, not a live feed
          </p>
        </div>

        {/* Summary bar */}
        <div className="card bg-teal-700 border-0">
          <div className="grid grid-cols-4 gap-6">
            {[
              { label: 'Agents Running',  value: '3 / 4' },
              { label: 'Tasks Today',     value: '14' },
              { label: 'Avg Success',     value: '97.5%' },
              { label: 'Uptime',          value: '99.9%' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-teal-200 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Agents grid */}
        <div className="grid grid-cols-2 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="card space-y-4 animate-fade-in">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${agent.color === 'teal' ? 'bg-teal-50' : 'bg-orange-50'}`}>
                    <Zap size={16} className={agent.color === 'teal' ? 'text-teal-700' : 'text-orange-600'} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{agent.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'active' ? 'bg-teal-500 animate-pulse' : 'bg-gray-300'}`} />
                      <span className="text-xs text-gray-400 capitalize">{agent.status} · last ran {agent.lastRun}</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">{agent.description}</p>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center bg-gray-50 rounded-lg p-2">
                  <p className="text-sm font-bold text-gray-900">{agent.tasksToday}</p>
                  <p className="text-[10px] text-gray-400">Today</p>
                </div>
                <div className="text-center bg-gray-50 rounded-lg p-2">
                  <p className="text-sm font-bold text-teal-700">{agent.successRate}%</p>
                  <p className="text-[10px] text-gray-400">Success</p>
                </div>
                <div className="text-center bg-gray-50 rounded-lg p-2">
                  <p className="text-sm font-bold text-gray-900">{agent.avgRuntime}</p>
                  <p className="text-[10px] text-gray-400">Avg time</p>
                </div>
              </div>

              {/* Execution logs */}
              <div>
                <p className="section-label mb-2">Recent Execution Logs</p>
                <div className="space-y-1.5">
                  {agent.recentLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      {log.status === 'pass'
                        ? <CheckCircle size={12} className="text-teal-500 mt-0.5 shrink-0" />
                        : <AlertTriangle size={12} className="text-orange-500 mt-0.5 shrink-0" />
                      }
                      <span className="text-gray-400 shrink-0">{log.time}</span>
                      <span className="text-gray-600">{log.event}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-center text-gray-400">
          Powered by Gemini 1.5 Flash on Google Cloud
        </p>
      </main>
    </div>
  );
}

export default function AgentsPage() {
  return (
    <RequireAuth role="recruiter">
      <AgentsContent />
    </RequireAuth>
  );
}
