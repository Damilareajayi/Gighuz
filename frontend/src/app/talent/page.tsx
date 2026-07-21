'use client';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { Freelancer } from '@/lib/types';

function TalentContent() {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.listFreelancers()
      .then((data: any) => setFreelancers(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = freelancers.filter(f =>
    !search ||
    f.skills.some(s => s.toLowerCase().includes(search.toLowerCase())) ||
    f.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar role="recruiter" />
      <main className="ml-56 flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Talent Pool</h1>
            <p className="text-sm text-gray-500 mt-0.5">Vetted professionals, AI-scored for every job</p>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="border border-surface-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-teal-500 w-56"
              placeholder="Search skills or country..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading talent…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-sm text-gray-500">No matching freelancers found.</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {filtered.map(f => (
            <div key={f.id} className="card-hover animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-teal-700 flex items-center justify-center text-white font-bold">
                  {f.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{f.name}</p>
                  <p className="text-xs text-gray-400">{f.country}</p>
                </div>
                <div className="ml-auto">
                  <div className={`w-2 h-2 rounded-full ${f.availability === 'open' ? 'bg-teal-500' : 'bg-gray-300'}`} />
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap mb-4">
                {f.skills.map(s => (
                  <span key={s} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-sm font-bold text-orange-600">{f.expertiseClusterScore}</p>
                  <p className="text-[10px] text-gray-400">AI Score</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-sm font-bold text-gray-800">⭐ {f.averageRating}</p>
                  <p className="text-[10px] text-gray-400">Rating</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-sm font-bold text-gray-800">{f.completedJobs}</p>
                  <p className="text-[10px] text-gray-400">Jobs</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-surface-border">
                <span className="text-xs text-gray-500">Earned: <span className="text-teal-700 font-medium">{formatCurrency(f.totalEarnings / 100)}</span></span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function TalentPage() {
  return (
    <RequireAuth role="recruiter">
      <TalentContent />
    </RequireAuth>
  );
}
