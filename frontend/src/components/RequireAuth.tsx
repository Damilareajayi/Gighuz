'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, Role } from '@/lib/auth';

export function RequireAuth({ role, children }: { role?: Role; children: React.ReactNode }) {
  const router = useRouter();
  const { user, profile, loading, needsOnboarding } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user || needsOnboarding) {
      router.replace('/login');
      return;
    }
    if (role && profile?.role !== role) {
      router.replace(profile?.role === 'recruiter' ? '/dashboard' : '/submissions');
    }
  }, [loading, user, needsOnboarding, profile, role, router]);

  if (loading || !user || needsOnboarding || (role && profile?.role !== role)) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>;
  }

  return <>{children}</>;
}
