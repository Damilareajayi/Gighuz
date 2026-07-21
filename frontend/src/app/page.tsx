import Link from 'next/link';
import { Briefcase, ShieldCheck, Wallet, Zap, ArrowRight } from 'lucide-react';
import { LogoMark } from '@/components/Logo';

const steps = [
  {
    icon: Briefcase,
    title: 'Post a job',
    description: 'Describe what you need in plain language. The Structuring Agent turns it into clear, priced milestones.',
  },
  {
    icon: Zap,
    title: 'Get matched',
    description: 'The Matching Agent ranks vetted African freelancers by skill fit, rating, and track record — instantly.',
  },
  {
    icon: ShieldCheck,
    title: 'Work gets audited',
    description: 'Before anything reaches you, the Deliverable Auditor checks it against your acceptance criteria.',
  },
  {
    icon: Wallet,
    title: 'Payment releases automatically',
    description: 'Funds sit in escrow until work passes audit, then payout routes instantly via Paystack or Flutterwave.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-alt">
      {/* Nav */}
      <header className="border-b border-surface-border bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <span className="font-bold text-lg">
              <span className="text-teal-700">Gig</span>
              <span className="text-orange-600">Huz</span>
            </span>
          </div>
          <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-14 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
          The borderless engine <br className="hidden md:block" /> for global work
        </h1>
        <p className="mt-5 text-base md:text-lg text-gray-500 max-w-2xl mx-auto">
          GigHuz connects international clients with vetted African freelance talent.
          Four AI agents structure every job, match the right person, audit every
          deliverable, and release payment automatically — so quality is guaranteed
          on both sides.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/login?mode=signup&role=recruiter" className="btn-primary flex items-center gap-2 px-6 py-3 text-base">
            Hire Talent <ArrowRight size={16} />
          </Link>
          <Link href="/login?mode=signup&role=freelancer" className="btn-outline flex items-center gap-2 px-6 py-3 text-base">
            Find Work <ArrowRight size={16} />
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Already have an account? <Link href="/login" className="text-teal-700 font-medium hover:underline">Sign in</Link>
        </p>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-14">
        <p className="section-label text-center mb-2">How it works</p>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
          AI-orchestrated, end to end
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map(({ icon: Icon, title, description }, i) => (
            <div key={title} className="card">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-teal-50">
                  <Icon size={16} className="text-teal-700" />
                </div>
                <span className="text-xs font-semibold text-gray-400">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two audiences */}
      <section className="max-w-5xl mx-auto px-6 py-14">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card space-y-3">
            <span className="badge-teal">For Recruiters</span>
            <h3 className="text-lg font-bold text-gray-900">Post a job, not a job description novel</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Skip the back-and-forth of scoping and vetting. Describe what you need,
              let AI structure it into milestones, and get matched with talent that's
              actually qualified — every deliverable is audited before it reaches you.
            </p>
            <Link href="/login?mode=signup&role=recruiter" className="btn-primary inline-flex items-center gap-2 mt-2">
              Post your first job <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card space-y-3">
            <span className="badge-orange">For Freelancers</span>
            <h3 className="text-lg font-bold text-gray-900">Get matched to real, funded work</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Every job you're matched to is already funded in escrow. Submit your
              work, get AI feedback before the client ever sees a rough draft, and
              get paid the moment it passes — straight to Paystack or Flutterwave.
            </p>
            <Link href="/login?mode=signup&role=freelancer" className="btn-outline inline-flex items-center gap-2 mt-2">
              Create your profile <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border bg-white">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="text-sm font-semibold">
              <span className="text-teal-700">Gig</span>
              <span className="text-orange-600">Huz</span>
            </span>
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} GigHuz. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
