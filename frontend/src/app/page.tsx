import Link from 'next/link';
import { Briefcase, ShieldCheck, Wallet, Zap, ArrowRight, CheckCircle2, Users, FileCheck } from 'lucide-react';
import { LogoMark } from '@/components/Logo';

const recruiterPoints = [
  'AI structures your job post into clear, priced milestones in seconds',
  'Get matched with vetted freelancers ranked by skill fit and track record',
  'Every deliverable is audited against your criteria before you see it',
  'Funds sit in escrow until work passes — you never pay for nothing',
];

const freelancerPoints = [
  'Every job you’re matched to is already funded in escrow',
  'Get AI feedback on your submission before the client sees a rough draft',
  'Get paid the moment your work passes — straight to your bank or mobile money',
  'Build a profile with an AI-generated resume from your skills and track record',
];

const steps = [
  {
    icon: Briefcase,
    title: 'Post a job',
    description: 'Describe what you need in plain language. The Structuring Agent turns it into clear, priced milestones.',
  },
  {
    icon: Zap,
    title: 'Get matched',
    description: 'The Matching Agent ranks vetted freelancers by skill fit, rating, and track record — instantly.',
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
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <span className="font-bold text-lg">
              <span className="text-teal-700">Gig</span>
              <span className="text-orange-600">Huz</span>
            </span>
          </Link>
          <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-14 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
          The borderless engine <br className="hidden md:block" /> for global work
        </h1>
        <p className="mt-5 text-base md:text-lg text-gray-500 max-w-2xl mx-auto">
          GigHuz connects clients with vetted freelance talent anywhere in the world.
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

      {/* Two audiences — big, color-differentiated, side by side */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="section-label mb-2">Two sides, one platform</p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Whichever side of the deal you're on
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Hire Talent — teal */}
          <div className="rounded-2xl bg-teal-700 text-white p-8 md:p-10 flex flex-col shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center mb-6">
              <Users size={22} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-teal-200 mb-2">For Recruiters</span>
            <h3 className="text-3xl font-bold mb-3">Hire Talent</h3>
            <p className="text-teal-100 text-sm leading-relaxed mb-7">
              Post a job, not a job-description novel. Describe what you need and
              let AI handle the scoping, matching, and quality control.
            </p>
            <ul className="space-y-3 mb-8 flex-1">
              {recruiterPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-teal-50">
                  <CheckCircle2 size={16} className="text-teal-200 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <Link href="/login?mode=signup&role=recruiter"
              className="bg-white text-teal-700 font-semibold px-6 py-3.5 rounded-lg hover:bg-teal-50 transition-colors inline-flex items-center justify-center gap-2 text-base">
              Post a Job <ArrowRight size={16} />
            </Link>
          </div>

          {/* Find Work — orange */}
          <div className="rounded-2xl bg-orange-600 text-white p-8 md:p-10 flex flex-col shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center mb-6">
              <FileCheck size={22} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-orange-100 mb-2">For Freelancers</span>
            <h3 className="text-3xl font-bold mb-3">Find Work</h3>
            <p className="text-orange-50 text-sm leading-relaxed mb-7">
              Get matched to real, funded work — no chasing invoices, no
              scope creep, no wondering if a client will actually pay.
            </p>
            <ul className="space-y-3 mb-8 flex-1">
              {freelancerPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-orange-50">
                  <CheckCircle2 size={16} className="text-orange-100 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <Link href="/login?mode=signup&role=freelancer"
              className="bg-white text-orange-600 font-semibold px-6 py-3.5 rounded-lg hover:bg-orange-50 transition-colors inline-flex items-center justify-center gap-2 text-base">
              Find Work <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border bg-white">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="text-sm font-semibold">
              <span className="text-teal-700">Gig</span>
              <span className="text-orange-600">Huz</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms of Use</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
            <span>© {new Date().getFullYear()} GigHuz. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
