import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

// Connect to the local Firebase Emulator Suite in dev — avoids needing a real
// Firebase project just to run the app locally. Guarded so hot-reload doesn't
// try to reconnect an already-connected auth instance.
declare global {
  // eslint-disable-next-line no-var
  var __GIGHUZ_EMULATOR_CONNECTED__: boolean | undefined;
}

if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' &&
  !globalThis.__GIGHUZ_EMULATOR_CONNECTED__
) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  globalThis.__GIGHUZ_EMULATOR_CONNECTED__ = true;
}
