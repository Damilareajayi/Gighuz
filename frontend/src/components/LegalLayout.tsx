import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LogoMark } from './Logo';

export function LegalLayout({ title, lastUpdated, children }: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="border-b border-surface-border bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-bold text-lg">
              <span className="text-teal-700">Gig</span>
              <span className="text-orange-600">Huz</span>
            </span>
          </Link>
          <Link href="/" className="btn-ghost text-sm flex items-center gap-1.5">
            <ArrowLeft size={14} /> Back home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">{title}</h1>
        <p className="text-xs text-gray-400 mb-10">Last updated: {lastUpdated}</p>
        <div className="space-y-9">{children}</div>
      </main>

      <footer className="border-t border-surface-border bg-white">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-gray-400">
          <span>© {new Date().getFullYear()} GigHuz. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms of Use</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}
