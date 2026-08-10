'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Apple, Monitor, Download } from 'lucide-react';

function AndroidIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 9v6a1 1 0 001 1h1v3a1.5 1.5 0 003 0v-3h2v3a1.5 1.5 0 003 0v-3h1a1 1 0 001-1V9H6z" fill="currentColor" />
      <rect x="3.5" y="9" width="2" height="6" rx="1" fill="currentColor" />
      <rect x="18.5" y="9" width="2" height="6" rx="1" fill="currentColor" />
      <path d="M8 5.5 6.8 3.6M16 5.5l1.2-1.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="7" y="5.5" width="10" height="3" rx="1.5" fill="currentColor" />
      <circle cx="9.5" cy="7" r="0.6" fill="white" />
      <circle cx="14.5" cy="7" r="0.6" fill="white" />
    </svg>
  );
}

// Only relevant to people browsing the web version -- once GigHuz is
// already added to the home screen, the app runs in "standalone" display
// mode (or navigator.standalone on iOS Safari specifically), and there's
// nothing left to install.
function isRunningInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(standaloneMedia || iosStandalone);
}

export function InstallCallout() {
  const [installed, setInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    setInstalled(isRunningInstalled());
  }, []);

  if (installed !== false) return null;

  return (
    <Link href="/install"
      className="mt-6 inline-flex items-center gap-3 text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-orange-600 rounded-xl px-4 py-3 shadow-md shadow-orange-600/20 hover:shadow-lg active:scale-[0.97] transition-all">
      <Download size={16} />
      <span className="flex items-center gap-1.5">
        <Apple size={14} /> <AndroidIcon size={14} /> <Monitor size={14} />
      </span>
      <span className="w-px h-3.5 bg-white/30" />
      Install the app — no App Store needed
    </Link>
  );
}
