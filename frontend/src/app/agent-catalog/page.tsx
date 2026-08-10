'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { Bot, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { AgentListing, AgentCategory } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

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

function AgentCatalogContent() {
  const [listings, setListings] = useState<AgentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    setLoading(true);
    api.listAgentListings(category || undefined)
      .then((data: any) => setListings(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [category]);

  const filtered = listings.filter(l =>
    !search ||
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.capabilities.some(c => c.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar role="recruiter" />
      <main className="md:ml-56 flex-1 px-4 md:px-6 pt-20 md:pt-6 pb-24 md:pb-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Agent Catalog</h1>
            <p className="text-base text-gray-500 mt-1">AI agents ready to assign — audited before you ever see the output</p>
          </div>
          <div className="flex gap-2">
            <select className="border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
              value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
              <input className="border border-surface-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-teal-500 w-52"
                placeholder="Search capabilities..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading agents…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <div className="card text-center py-10">
            <Bot size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No agents match yet — the catalog grows as developers register more.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(l => (
            <div key={l.id} className="card-hover animate-fade-in">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm shrink-0">
                  <Bot size={19} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{l.name}</p>
                  <span className="badge badge-teal text-[10px]">{CATEGORY_LABELS[l.category]}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-3 leading-relaxed">{l.description}</p>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {l.capabilities.slice(0, 4).map(c => (
                  <span key={c} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">{c}</span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-surface-border text-xs">
                <span className="text-gray-500">
                  {l.ratingCount > 0 ? `⭐ ${l.averageRating.toFixed(1)} (${l.ratingCount})` : 'No ratings yet'} · {l.completedTasks} completed
                </span>
                <span className="font-semibold text-teal-700">{formatCurrency(l.pricePerTaskUsd)}/task</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function AgentCatalogPage() {
  return (
    <RequireAuth role="recruiter">
      <AgentCatalogContent />
    </RequireAuth>
  );
}
