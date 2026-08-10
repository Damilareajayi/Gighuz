'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Plus, Bot, CheckCircle2, PauseCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { AgentListing, AgentCategory } from '@/lib/types';
import { formatCurrency, timeAgo } from '@/lib/utils';

const CATEGORY_LABELS: Record<AgentCategory, string> = {
  branding: 'Branding',
  digital_marketing: 'Digital Marketing',
  graphic_design: 'Graphic Design',
  software_development: 'Software Development',
  presentation: 'Presentations',
  seo: 'SEO',
  content_writing: 'Content Writing',
  data_analysis: 'Data Analysis',
  customer_support: 'Customer Support',
  other: 'Other',
};

function RegisterForm({ onClose, onRegistered }: { onClose: () => void; onRegistered: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AgentCategory>('software_development');
  const [capabilities, setCapabilities] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [authHeader, setAuthHeader] = useState('');
  const [pricePerTaskUsd, setPricePerTaskUsd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setBusy(true);
    setError('');
    try {
      await api.registerAgentListing({
        name,
        description,
        category,
        capabilities: capabilities.split(',').map(s => s.trim()).filter(Boolean),
        endpointUrl,
        authHeader: authHeader || undefined,
        pricePerTaskUsd: Number(pricePerTaskUsd),
      });
      onRegistered();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register agent');
    } finally {
      setBusy(false);
    }
  }

  const valid = name && description.length >= 20 && capabilities && endpointUrl && Number(pricePerTaskUsd) > 0;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Register an AI Agent</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
      </div>
      <p className="text-xs text-gray-400 -mt-2">Free to list. You only get paid when a task you're assigned is completed and passes audit.</p>

      <input className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
        placeholder="Agent name (e.g. SEO Content Optimizer)" value={name} onChange={e => setName(e.target.value)} />

      <textarea className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500 resize-none h-20"
        placeholder="What does it do? (min 20 characters)" value={description} onChange={e => setDescription(e.target.value)} />

      <select className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
        value={category} onChange={e => setCategory(e.target.value as AgentCategory)}>
        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <input className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
        placeholder="Capabilities, comma separated (e.g. keyword research, meta descriptions)"
        value={capabilities} onChange={e => setCapabilities(e.target.value)} />

      <input className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
        placeholder="Endpoint URL — https://your-agent.example.com/invoke" value={endpointUrl} onChange={e => setEndpointUrl(e.target.value)} />

      <input className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
        placeholder="Auth header value (optional, e.g. Bearer sk-...)" value={authHeader} onChange={e => setAuthHeader(e.target.value)} />

      <input type="number" className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
        placeholder="Indicative price per task (USD)" value={pricePerTaskUsd} onChange={e => setPricePerTaskUsd(e.target.value)} />

      {error && <ErrorBanner message={error} />}

      <button onClick={handleSubmit} disabled={!valid || busy} className="btn-primary w-full">
        {busy ? 'Registering…' : 'Register Agent'}
      </button>
    </div>
  );
}

function MyAgentsContent() {
  const [listings, setListings] = useState<AgentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  function load() {
    setLoading(true);
    api.myAgentListings()
      .then((data: any) => setListings(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function toggleStatus(listing: AgentListing) {
    const nextStatus = listing.status === 'active' ? 'disabled' : 'active';
    await api.updateAgentListing(listing.id, { status: nextStatus });
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, status: nextStatus } : l));
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="agent_developer" />
      <main className="md:ml-56 flex-1 px-4 md:px-6 pt-20 md:pt-6 pb-24 md:pb-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">My Agents</h1>
            <p className="text-base text-gray-500 mt-1">Register agents, get matched to tasks, get paid on completion</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Register Agent
          </button>
        </div>

        {showForm && <RegisterForm onClose={() => setShowForm(false)} onRegistered={load} />}

        {loading && <p className="text-sm text-gray-400">Loading…</p>}
        {error && <ErrorBanner message={error} />}
        {!loading && !error && listings.length === 0 && (
          <div className="card text-center py-10">
            <Bot size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No agents registered yet.</p>
          </div>
        )}

        <div className="space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="card-hover">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-gray-900">{l.name}</h3>
                    <span className="badge badge-teal">{CATEGORY_LABELS[l.category]}</span>
                    {l.status === 'active'
                      ? <span className="flex items-center gap-1 text-xs text-teal-600"><CheckCircle2 size={11} /> Active</span>
                      : <span className="flex items-center gap-1 text-xs text-gray-400"><PauseCircle size={11} /> Disabled</span>}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{l.description}</p>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {l.capabilities.map(c => (
                      <span key={c} className="text-xs bg-gray-50 border border-surface-border text-gray-500 px-2 py-0.5 rounded">{c}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatCurrency(l.pricePerTaskUsd)}/task</span>
                    <span>·</span>
                    <span>{l.completedTasks} completed</span>
                    <span>·</span>
                    <span>{l.ratingCount > 0 ? `⭐ ${l.averageRating.toFixed(1)} (${l.ratingCount} rating${l.ratingCount === 1 ? '' : 's'})` : 'No ratings yet'}</span>
                    <span>·</span>
                    <span>Registered {timeAgo(l.createdAt)}</span>
                  </div>
                </div>
                <button onClick={() => toggleStatus(l)} className="btn-outline text-xs px-3 py-1.5 shrink-0">
                  {l.status === 'active' ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function MyAgentsPage() {
  return (
    <RequireAuth role="agent_developer">
      <MyAgentsContent />
    </RequireAuth>
  );
}
