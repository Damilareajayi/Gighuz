import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
const hasExplicitCredentials = Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

export function initFirebase() {
  if (getApps().length === 0) {
    if (usingEmulator) {
      // Emulators don't check credentials — just need a project id to match the client.
      initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'demo-gighuz' });
      console.log('[Firebase] Connected to local emulators');
    } else if (hasExplicitCredentials) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      // No service-account key configured — fall back to Application Default
      // Credentials. On Cloud Run (and any GCP compute product), the ADK
      // auto-loads the runtime service account's identity from the metadata
      // server, so no key file needs to exist anywhere. The runtime service
      // account still needs Firestore/Auth/Storage IAM roles granted.
      initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
      console.log('[Firebase] Using Application Default Credentials');
    }

    // Several of our types have fields that are only set for one worker type
    // (freelancerId vs. agentListingId/developerId) — without this, an
    // object-shorthand property that happens to be undefined throws instead
    // of just being omitted from the document.
    getFirestore().settings({ ignoreUndefinedProperties: true });
  }
  return { db: getFirestore(), auth: getAuth() };
}

export const db  = () => getFirestore();
export const auth = () => getAuth();
