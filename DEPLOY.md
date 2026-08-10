# Deploying GigHuz

Backend → Google Cloud Run. Frontend → Vercel. Both already read all
config from environment variables — nothing in the code assumes local
emulators once these are set.

## Current status (as of 2026-08-10)

Both are live:
- **Backend**: `https://gighuz-backend-174251690360.us-central1.run.app` (Cloud Run, project `gighuz-app`, region `us-central1`)
- **Frontend**: `https://gighuz.vercel.app` (Vercel project `dami17/gighuz`)

Redeploying either after a code change:
```bash
# Backend
cd backend && gcloud run deploy gighuz-backend --source . --project gighuz-app --region us-central1 --allow-unauthenticated --port 8080

# Frontend
cd frontend && vercel --prod --yes
```
Both CLIs are already authenticated on this machine. Env vars persist
across redeploys unless explicitly changed with `--update-env-vars` /
`vercel env`.

**Still open**: native Google Sign-In on mobile (see `MOBILE.md`) and
Firebase Storage-dependent features (avatar/resume upload) haven't been
smoke-tested against the real bucket yet.

## Runbook (for reference / rebuilding from scratch)

## 1. Backend → Google Cloud Run

From `backend/`, with the [gcloud CLI](https://cloud.google.com/sdk/docs/install)
authenticated (`gcloud auth login`) and pointed at your project
(`gcloud config set project YOUR_PROJECT_ID`):

```bash
gcloud run deploy gighuz-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

`gcloud` builds the existing `Dockerfile` and deploys it — no separate
build step needed. It'll print a service URL like
`https://gighuz-api-xxxxx.a.run.app`; you'll need that for step 2.

**Environment variables** — set these on the Cloud Run service (`gcloud run
services update gighuz-api --set-env-vars KEY=value,...` or via the Cloud
Run console's "Variables & Secrets" tab, which also lets you pull from
Secret Manager instead of plaintext env vars for the sensitive ones):

| Variable | Notes |
|---|---|
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | From a service account key on your **real** Firebase project (Project Settings → Service Accounts → Generate new private key). Do **not** paste this key into chat with me — set it directly in Cloud Run/Secret Manager. |
| `FIREBASE_STORAGE_BUCKET` | `<project-id>.appspot.com` |
| `GEMINI_API_KEY` | From Google AI Studio. Without it, every AI agent silently falls back to its deterministic non-AI output — the app still works, just less smart. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Live keys once you're ready to take real payments; without them, escrow silently simulates instead of failing. |
| `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY` | Same simulate-if-missing behavior for payouts. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` | For WhatsApp notifications. |
| `INTERNAL_AGENT_SECRET` | A random string you generate — the shared secret the first-party agent routes check for. Must match what you seed into each `AgentListing.authHeader` (see `backend/scripts/seed-demo.js` for the pattern; you'll want a production seed, not the demo one, for real launch). |
| `ALLOWED_ORIGIN` | Set to your real Vercel URL once you have it (step 2) — this is what CORS checks against. |
| `NODE_ENV` | `production` |
| `API_URL` | The Cloud Run URL itself — used when seeding `AgentListing.endpointUrl` for first-party agents. |

Do **not** set `FIRESTORE_EMULATOR_HOST` or `FIREBASE_AUTH_EMULATOR_HOST`
in production — their mere presence is what `services/firebase.ts` checks
to decide whether to use the emulator or real credentials.

## 2. Frontend → Vercel

Easiest path is Vercel's dashboard, no CLI needed:

1. [vercel.com/new](https://vercel.com/new) → import the `Gighuz` GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Add environment variables (Project Settings → Environment Variables):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Cloud Run URL from step 1 |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | From your Firebase project's web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same |

Leave `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` unset (or `false`) so it talks to
the real Firebase project instead of a local emulator.

4. Deploy. Vercel gives you a `https://<project>.vercel.app` URL (or your
   own domain if you attach one).
5. Go back to Cloud Run and set `ALLOWED_ORIGIN` to that URL — the backend
   will reject requests from an origin it doesn't recognize otherwise.

## 3. Point the mobile app at production

Once both are live, `frontend/capacitor.config.ts`'s `server.url` needs to
point at the real Vercel URL for a store-ready build:

```bash
cd frontend
CAPACITOR_SERVER_URL=https://<your-vercel-url> npx cap sync
```

See `MOBILE.md` for the rest of the Android/iOS build steps and the
still-open Google Sign-In native-webview gap — that one's actually
unblocked now that a real Firebase project exists, and is worth doing
before app store submission.

## 4. Production data

Every account, job, and agent listing created against the local emulator
lives only in the emulator — none of it carries over. You'll want to
either seed a production version of the demo data (adapt
`backend/scripts/seed-demo.js`, pointed at the real project instead of the
emulator) or just let real signups populate it from launch.
