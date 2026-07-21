'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { api } from './api';

export type Role = 'recruiter' | 'freelancer';

interface Profile {
  id: string;
  uid: string;
  role: Role;
  name: string;
  [key: string]: unknown;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  needsOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  completeOnboarding: (role: Role, profileData: object) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const me = (await api.getMe()) as Profile;
      setProfile(me);
      setNeedsOnboarding(false);
    } catch {
      setProfile(null);
      setNeedsOnboarding(true);
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadProfile();
      } else {
        setProfile(null);
        setNeedsOnboarding(false);
      }
      setLoading(false);
    });
  }, [loadProfile]);

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(email: string, password: string) {
    await createUserWithEmailAndPassword(auth, email, password);
  }

  async function signInWithGoogle() {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async function completeOnboarding(role: Role, profileData: object) {
    if (role === 'freelancer') {
      await api.createFreelancer(profileData);
    } else {
      await api.createRecruiter(profileData);
    }
    await loadProfile();
  }

  async function signOutUser() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, needsOnboarding, signIn, signUp, signInWithGoogle, completeOnboarding, signOutUser, refreshProfile: loadProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
