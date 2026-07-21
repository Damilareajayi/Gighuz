# GigHuz

AI-orchestrated global freelance marketplace connecting clients and freelance talent, anywhere in the world. Four Gemini-powered agents handle job structuring, talent matching, deliverable auditing, and client/freelancer communication; Stripe holds client funds in escrow and Paystack/Flutterwave route payouts.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how the system is put together.

## Structure

```
backend/    Express + TypeScript API, Firebase Admin, Gemini agents, Stripe/Paystack/Flutterwave
frontend/   Next.js 14 (App Router) dashboard for recruiters and freelancers
firebase.json, .firebaserc, firestore.rules   Local emulator config
```

## Prerequisites

- Node.js 20+
- A Firebase project with **Authentication** (Email/Password, Google, Phone) and **Firestore** enabled — for local development you can instead run the **Firebase Emulator Suite**, which needs a JRE (see below)

## Local development

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

Copy the `.env.example` files and fill them in:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

- **Real Firebase project**: fill in `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` (service account JSON) in `backend/.env`, and the web config (`NEXT_PUBLIC_FIREBASE_*`) in `frontend/.env.local`.
- **Local emulators instead** (no cloud project needed): set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8081` and `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` in `backend/.env`, and `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` with `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-gighuz` in `frontend/.env.local`. The Firestore emulator needs a JRE on `PATH` (`java -version` to check) — a portable, no-install JDK zip works fine if you don't want a system-wide install.

`GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`, and the Twilio vars are optional for local dev — every AI agent and payment path has a deterministic fallback that runs when the real API call fails, so the app stays usable without any of those keys. They're required for the AI/payment features to actually do their job.

### 3. Run everything

```bash
# terminal 1 — only if using local emulators
npx firebase-tools emulators:start --project=demo-gighuz

# terminal 2
cd backend && npm run dev      # http://localhost:8080

# terminal 3
cd frontend && npm run dev     # http://localhost:3000
```

### 4. Seed demo data (emulator mode only)

```bash
cd backend
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node scripts/seed-demo.js
```

Creates two working accounts:

| Role | Email | Password |
|---|---|---|
| Recruiter | `demo.recruiter@gighuz.test` | `Demo1234!` |
| Freelancer | `demo.freelancer@gighuz.test` | `Demo1234!` |

Emulator data is in-memory only and resets when the emulator process stops, so re-run the seed script after each fresh `emulators:start`.

## Known gaps

- No file-storage bucket is provisioned by default — avatar/resume uploads need `FIREBASE_STORAGE_BUCKET` pointed at a real bucket.
- No recruiter-side profile page yet (recruiters can post jobs and browse talent, but can't edit their own profile in the UI).
- Submissions accept pasted file URLs, not direct uploads.
- The `/agents` page is illustrative — there's no live agent-execution-log endpoint yet (agent runs currently just `console.log`).
