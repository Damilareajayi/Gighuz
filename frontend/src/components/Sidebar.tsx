'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Briefcase, Users, FileCheck, CreditCard, Zap, LogOut } from 'lucide-react';
import { LogoMark } from './Logo';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const recruiterNav = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/jobs',       label: 'My Jobs',     icon: Briefcase },
  { href: '/talent',     label: 'Talent Pool', icon: Users },
  { href: '/payments',   label: 'Payments',    icon: CreditCard },
];

const freelancerNav = [
  { href: '/submissions', label: 'Submissions', icon: FileCheck },
  { href: '/payments',    label: 'Earnings',    icon: CreditCard },
  { href: '/profile',     label: 'Profile',     icon: Users },
];

const agentNav = [
  { href: '/agents', label: 'AI Agents', icon: Zap },
];

export function Sidebar({ role = 'recruiter' }: { role?: 'recruiter' | 'freelancer' }) {
  const path = usePathname();
  const router = useRouter();
  const { profile, signOutUser } = useAuth();

  const nav = role === 'recruiter' ? recruiterNav : freelancerNav;

  async function handleSignOut() {
    await signOutUser();
    router.replace('/login');
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-white border-r border-surface-border flex flex-col z-20 shadow-sm">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <LogoMark size={32} />
          <div>
            <div className="font-bold text-lg leading-none">
              <span className="text-teal-700">Gig</span>
              <span className="text-orange-600">Huz</span>
            </div>
            <p className="text-[9px] text-gray-400 tracking-wide mt-0.5">
              {role === 'recruiter' ? 'Recruiter Portal' : 'Talent Gateway'}
            </p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="section-label px-2 mb-2">
          {role === 'recruiter' ? 'Manage' : 'Work'}
        </p>
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={cn('nav-link', path === href && 'active')}>
            <Icon size={16} />
            {label}
          </Link>
        ))}

        <div className="pt-4">
          <p className="section-label px-2 mb-2">System</p>
          {agentNav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn('nav-link', path === href && 'active')}>
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-surface-border">
        <div className="flex items-center gap-2.5">
          {profile?.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.profilePictureUrl as string} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-teal-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(profile?.name || (role === 'recruiter' ? 'R' : 'F')).slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-700 truncate">{profile?.name || (role === 'recruiter' ? 'Recruiter' : 'Freelancer')}</p>
            <p className="text-[10px] text-gray-400 truncate capitalize">{role} account</p>
          </div>
          <button onClick={handleSignOut} title="Sign out" className="text-gray-400 hover:text-orange-600 shrink-0">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
