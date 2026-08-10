'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  User,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth } from './firebase';
import { api } from './api';

export type Role = 'recruiter' | 'freelancer' | 'agent_developer';

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
    // signInWithPopup opens an OAuth popup, which Google blocks inside
    // Capacitor's embedded webview (disallowed_useragent). On native
    // platforms, run the native Google Sign-In flow instead and hand its
    // ID token to the JS SDK, so auth.currentUser / onAuthStateChanged
    // stay the single source of truth either way.
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      if (!idToken) throw new Error('Google sign-in did not return a credential');
      await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    } else {
      await signInWithPopup(auth, new GoogleAuthProvider());
    }
  }

  async function completeOnboarding(role: Role, profileData: object) {
    if (role === 'freelancer') {
      await api.createFreelancer(profileData);
    } else if (role === 'agent_developer') {
      await api.createAgentDeveloper(profileData);
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
