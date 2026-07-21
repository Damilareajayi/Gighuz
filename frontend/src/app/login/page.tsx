'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { LogoMark } from '@/components/Logo';
import { useAuth, Role } from '@/lib/auth';
import { auth } from '@/lib/firebase';
import { COUNTRY_CODES, flagEmoji } from '@/lib/countryCodes';

type Mode = 'signin' | 'signup';
type PhoneStep = 'enter-number' | 'enter-code';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, needsOnboarding, signIn, signUp, signInWithGoogle, completeOnboarding } = useAuth();

  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Phone auth
  const [showPhone, setShowPhone] = useState(false);
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter-number');
  const [dialCode, setDialCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const [role, setRole] = useState<Role>(searchParams.get('role') === 'recruiter' ? 'recruiter' : 'freelancer');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('US');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [company, setCompany] = useState('');

  useEffect(() => {
    if (!loading && user && !needsOnboarding && profile) {
      router.replace(profile.role === 'recruiter' ? '/dashboard' : '/submissions');
    }
  }, [loading, user, needsOnboarding, profile, router]);

  async function handleAuth() {
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') await signIn(email, password);
      else await signUp(email, password);
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '') || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '') || 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  function getRecaptcha() {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    }
    return recaptchaRef.current;
  }

  async function handleSendCode() {
    setError('');
    setBusy(true);
    try {
      const fullNumber = `${dialCode}${phoneNumber.replace(/\D/g, '')}`;
      confirmationRef.current = await signInWithPhoneNumber(auth, fullNumber, getRecaptcha());
      setPhoneStep('enter-code');
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '') || 'Could not send verification code');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyCode() {
    setError('');
    setBusy(true);
    try {
      if (!confirmationRef.current) throw new Error('Request a code first');
      await confirmationRef.current.confirm(code);
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '') || 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  async function handleOnboarding() {
    setError('');
    setBusy(true);
    try {
      if (role === 'freelancer') {
        await completeOnboarding('freelancer', {
          name,
          country: country.toUpperCase(),
          bio,
          skills: skills.split(',').map(s => s.trim()).filter(Boolean),
          portfolioLinks: [],
          whatsappNumber: user?.phoneNumber || undefined,
        });
      } else {
        await completeOnboarding('recruiter', {
          name,
          company: company || undefined,
          country: country.toUpperCase(),
        });
      }
    } catch (err: any) {
      setError(err.message || 'Could not create profile');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>;
  }

  // Signed in but no backend profile yet — onboarding form
  if (user && needsOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface-alt">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-sm border border-surface-border p-6 space-y-4">
          <div className="flex items-center gap-2.5 mb-2">
            <LogoMark size={32} />
            <span className="font-bold text-lg"><span className="text-teal-700">Gig</span><span className="text-orange-600">Huz</span></span>
          </div>
          <h1 className="font-bold text-gray-900">Complete your profile</h1>

          <div className="flex gap-2">
            {(['freelancer', 'recruiter'] as Role[]).map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`flex-1 text-sm px-3 py-2 rounded-lg border capitalize ${role === r ? 'border-teal-700 bg-teal-50 text-teal-700 font-semibold' : 'border-surface-border text-gray-500'}`}>
                {r}
              </button>
            ))}
          </div>

          <input className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
            placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
          <select className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
            value={country} onChange={e => setCountry(e.target.value)}>
            {COUNTRY_CODES.map(c => (
              <option key={c.iso2} value={c.iso2}>{flagEmoji(c.iso2)} {c.name}</option>
            ))}
          </select>

          {role === 'freelancer' ? (
            <>
              <textarea className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500 resize-none" rows={3}
                placeholder="Short bio (min 50 characters)" value={bio} onChange={e => setBio(e.target.value)} />
              <input className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
                placeholder="Skills, comma separated (e.g. React, Node.js)" value={skills} onChange={e => setSkills(e.target.value)} />
            </>
          ) : (
            <input className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
              placeholder="Company (optional)" value={company} onChange={e => setCompany(e.target.value)} />
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button onClick={handleOnboarding} disabled={busy || !name || country.length !== 2} className="btn-primary w-full">
            {busy ? 'Creating profile…' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  // Signed in with a complete profile — redirect is happening via effect
  if (user && !needsOnboarding) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Redirecting…</div>;
  }

  // Signed out — sign in / sign up
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-alt">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-sm border border-surface-border p-6 space-y-4">
        <div className="flex items-center gap-2.5 mb-2">
          <LogoMark size={32} />
          <span className="font-bold text-lg"><span className="text-teal-700">Gig</span><span className="text-orange-600">Huz</span></span>
        </div>

        <button onClick={handleGoogle} disabled={busy} className="btn-outline w-full flex items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.2-5.6l-6.6-5.4C29.6 34.7 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.4C41.4 35.6 44 30.1 44 24c0-1.3-.1-2.7-.4-3.5z"/></svg>
          Continue with Google
        </button>

        <button onClick={() => setShowPhone(s => !s)} className="btn-outline w-full">
          {showPhone ? 'Use email instead' : 'Continue with phone'}
        </button>

        <div id="recaptcha-container" />

        {showPhone ? (
          <div className="space-y-3">
            {phoneStep === 'enter-number' ? (
              <>
                <div className="flex gap-2">
                  <select className="border border-surface-border rounded-lg px-2 py-2.5 text-sm focus:outline-none focus:border-teal-500 max-w-[7.5rem]"
                    value={dialCode} onChange={e => setDialCode(e.target.value)}>
                    {COUNTRY_CODES.map(c => (
                      <option key={`${c.iso2}-${c.dialCode}`} value={c.dialCode}>
                        {flagEmoji(c.iso2)} {c.dialCode}
                      </option>
                    ))}
                  </select>
                  <input className="flex-1 min-w-0 border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
                    type="tel" placeholder="801 234 5678" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                </div>
                <button onClick={handleSendCode} disabled={busy || !phoneNumber} className="btn-primary w-full">
                  {busy ? 'Sending…' : 'Send verification code'}
                </button>
              </>
            ) : (
              <>
                <input className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
                  placeholder="6-digit code" value={code} onChange={e => setCode(e.target.value)} />
                <button onClick={handleVerifyCode} disabled={busy || code.length < 6} className="btn-primary w-full">
                  {busy ? 'Verifying…' : 'Verify code'}
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2 border-y border-surface-border py-3">
              <button onClick={() => setMode('signin')} className={`text-sm font-medium ${mode === 'signin' ? 'text-teal-700' : 'text-gray-400'}`}>Sign in</button>
              <span className="text-gray-300">·</span>
              <button onClick={() => setMode('signup')} className={`text-sm font-medium ${mode === 'signup' ? 'text-teal-700' : 'text-gray-400'}`}>Create account</button>
            </div>

            <input className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
              type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
              type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />

            <button onClick={handleAuth} disabled={busy || !email || !password} className="btn-primary w-full">
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
