'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Apple, ArrowLeft, Share, MoreVertical, Plus, Check, Monitor, CheckCircle2 } from 'lucide-react';
import { LogoMark } from '@/components/Logo';

function isRunningInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(standaloneMedia || iosStandalone);
}

function AndroidIcon({ size = 22, className = '' }: { size?: number; className?: string }) {
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

type Platform = 'ios' | 'android' | 'windows';

const platforms: { id: Platform; label: string; icon: React.ReactNode }[] = [
  { id: 'ios',     label: 'iPhone / iPad', icon: <Apple size={18} /> },
  { id: 'android', label: 'Android',        icon: <AndroidIcon size={18} /> },
  { id: 'windows', label: 'Windows / Mac',  icon: <Monitor size={18} /> },
];

const steps: Record<Platform, { icon: React.ReactNode; text: string }[]> = {
  ios: [
    { icon: <span className="font-bold">1</span>, text: 'Open gighuz.vercel.app in Safari (Add to Home Screen only works from Safari on iOS, not Chrome).' },
    { icon: <Share size={16} />, text: 'Tap the Share icon in the toolbar.' },
    { icon: <Plus size={16} />, text: 'Scroll down and tap "Add to Home Screen".' },
    { icon: <Check size={16} />, text: 'Tap "Add" in the top right. GigHuz now opens full-screen from your Home Screen, just like an installed app.' },
  ],
  android: [
    { icon: <span className="font-bold">1</span>, text: 'Open gighuz.vercel.app in Chrome.' },
    { icon: <MoreVertical size={16} />, text: 'Tap the ⋮ menu in the top right. If Chrome already shows an "Install app" banner, you can tap that instead and skip to step 4.' },
    { icon: <Plus size={16} />, text: 'Tap "Install app" (or "Add to Home screen" on older versions of Chrome).' },
    { icon: <Check size={16} />, text: 'Tap "Install" to confirm. GigHuz is added to your home screen and app drawer like any other app.' },
  ],
  windows: [
    { icon: <span className="font-bold">1</span>, text: 'Open gighuz.vercel.app in Edge or Chrome.' },
    { icon: <Monitor size={16} />, text: 'Click the install icon in the address bar (a small monitor with a down arrow), or open the ⋯ menu.' },
    { icon: <Plus size={16} />, text: 'Click "Install GigHuz" (or, from the menu, "Apps" → "Install this site as an app").' },
    { icon: <Check size={16} />, text: 'Confirm install. GigHuz opens in its own window and gets a shortcut in your Start Menu / Applications folder.' },
  ],
};

export default function InstallPage() {
  const [active, setActive] = useState<Platform>('ios');
  const [installed, setInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    setInstalled(isRunningInstalled());
  }, []);

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

      {installed ? (
        <main className="max-w-3xl mx-auto px-6 py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={26} className="text-teal-700" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">You're already set up</h1>
          <p className="text-base text-gray-500 mt-3 max-w-md mx-auto">
            You're using GigHuz as an installed app — there's nothing left to install.
          </p>
          <Link href="/" className="btn-primary inline-flex mt-7">Back to GigHuz</Link>
        </main>
      ) : (
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Install GigHuz</h1>
          <p className="text-base text-gray-500 mt-3 max-w-md mx-auto">
            No app store needed — add GigHuz to your home screen in a few taps
            and open it like any other app.
          </p>
        </div>

        <div className="flex gap-2 mb-8 justify-center flex-wrap">
          {platforms.map((p) => (
            <button key={p.id} onClick={() => setActive(p.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                active === p.id
                  ? 'border-teal-700 bg-teal-50 text-teal-700'
                  : 'border-surface-border text-gray-500 hover:bg-surface-alt'
              }`}>
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        <div className="card space-y-4">
          {steps[active].map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 text-white flex items-center justify-center shrink-0 text-sm">
                {step.icon}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed pt-1.5">{step.text}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 text-center mt-8">
          GigHuz runs as a full app on your device using your browser's built-in
          install feature — no App Store or Play Store download required.
        </p>
      </main>
      )}
    </div>
  );
}
