# Architecture

## Overview

```
                         ┌─────────────────────────┐
                         │   Next.js Frontend      │
                         │  (App Router, client-   │
                         │   rendered dashboards)  │
                         └───────────┬─────────────┘
                                     │ fetch + Firebase ID token
                                     ▼
                         ┌─────────────────────────┐
                         │   Express API (backend) │
                         │  requireAuth middleware │
                         └───────────┬─────────────┘
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
     ┌────────────────┐   ┌──────────────────┐   ┌────────────────────┐
     │ Firebase Auth   │   │ Firestore         │   │ Gemini AI Agents   │
     │ (identity)      │   │ (jobs, profiles,  │   │ structuring/       │
     │                 │   │  milestones, subs)│   │ matching/auditor/  │
     └────────────────┘   └──────────────────┘   │ comms/resume       │
                                     │              └──────────┬─────────┘
                                     │                          │
                                     ▼                          ▼
                         ┌─────────────────────────┐  ┌──────────────────┐
                         │ Stripe (escrow)          │  │ Twilio WhatsApp   │
                         │ Paystack/Flutterwave     │  │ (notifications)   │
                         │ (payout)                 │  └──────────────────┘
                         │ Firebase Storage         │
                         │ (avatars, resumes)        │
                         └─────────────────────────┘
```

Recruiters post jobs; the Structuring Agent turns raw text into priced milestones. Recruiters trigger matching; the Matching Agent ranks freelancers and the Comms Agent notifies them. Freelancers submit work; the Deliverable Auditor checks it against acceptance criteria and, on a pass, captures the Stripe escrow and routes a payout automatically.

## Backend (`backend/src`)

```
index.ts              App entry — CORS, Firebase init, route mounting
middleware/auth.ts     requireAuth(roles?) — verifies Firebase ID token, looks up
                        role + profileId from Firestore (freelancers/recruiters
                        collections keyed by `uid`)
routes/
  jobs.ts               POST/GET /jobs, /:id/structure, /:id/match, /:id/assign
  profiles.ts            onboarding, /me, /me/avatar, /me/resume(/generate),
                        /freelancers (recruiter talent search)
  submissions.ts         freelancer work submission → triggers the auditor
  payments.ts             milestone escrow funding, manual payout trigger
  webhooks.ts             Stripe + Flutterwave webhook receivers
agents/
  structuringAgent.ts     raw description → title, milestones, budget, skills
  matchingAgent.ts        job → ranked freelancer matches
  deliverableAuditor.ts   submission → pass/flag, capture escrow + payout on pass
  commsAgent.ts           event → WhatsApp message (via Gemini + Twilio)
  resumeAgent.ts          freelancer profile → generated resume text
services/
  firebase.ts             Admin SDK init (real credentials or local emulators)
  stripe.ts                escrow create/capture/cancel
  payouts.ts                Paystack/Flutterwave payout routing (NG → Paystack,
                        others → Flutterwave, by currency)
  storage.ts                Firebase Storage upload helper (avatars, resumes)
  whatsapp.ts               Twilio WhatsApp send + message templates
  pubsub.ts                  Pub/Sub event publishing (best-effort, non-fatal)
types/index.ts            Single source of truth for all shared types
```

### Design choice: agents own persistence and side effects

Routes are thin — they validate input, do the Firestore write for the entity being created, and call an agent. Each agent is responsible for **persisting its own output and triggering whatever comes next**:

- `structuringAgent` writes the structured milestones back onto the job doc and sets `status: 'structured'`.
- `matchingAgent` writes `matchedCandidateIds`, sets `status: 'matched'`, and calls `commsAgent` for every match.
- `deliverableAuditor` writes the audit result, and on a pass captures the Stripe escrow, calls `routePayout`, updates freelancer earnings, and notifies them — all in one place.

This keeps the routes readable and means the "what happens after the AI call" logic lives next to the AI call itself, not scattered across route handlers.

### Every agent has a deterministic fallback

Gemini calls are wrapped in `try/catch`. If the call fails or returns unparseable JSON, each agent falls back to a rule-based result instead of erroring:

- Structuring → a single "Project Delivery" milestone from the raw text
- Matching → top 3 freelancers sorted by rating
- Auditor → flags the submission for manual review
- Comms → a canned message per event type
- Resume → a template built directly from profile fields

This is why the app stays fully usable in local development without a real `GEMINI_API_KEY`.

### Auth model

There are no Firebase custom claims. Role is derived per-request: `requireAuth()` takes the verified `uid` and checks whether a `freelancers` or `recruiters` Firestore doc has a matching `uid` field, and attaches `role` + `profileId` to the request. A user who's authenticated with Firebase but hasn't completed onboarding (no matching Firestore doc) gets a 403, which the frontend (`needsOnboarding` in `lib/auth.tsx`) uses to route them into the profile-creation form.

### Payments

- **Escrow**: `POST /payments/milestones` creates a Stripe PaymentIntent with `capture_method: 'manual'` — funds are authorized but not captured until the auditor approves.
- **Capture + payout**: on an auditor pass, `captureEscrow()` captures the Stripe PaymentIntent, then `routePayout()` sends the freelancer's cut (82% — 18% platform fee) via Paystack (Nigeria) or Flutterwave (everywhere else), keyed off the freelancer's `country`/`currency` fields.
- **Webhooks**: `routes/webhooks.ts` listens for `payment_intent.succeeded` / `.payment_failed` to flip a milestone's status without relying on the client to report back.

## Frontend (`frontend/src`)

```
app/layout.tsx          Wraps everything in AuthProvider; whole app is
                        force-dynamic (nothing is prerenderable — every page
                        depends on client-side Firebase auth state)
app/login/page.tsx       Email/password, Google popup, and phone/SMS
                        (with country-code picker) sign-in; onboarding form
                        for first-time users
app/{dashboard,jobs,talent,agents}/     recruiter-facing pages
app/{submissions,payments,profile}/     freelancer-facing pages
components/RequireAuth.tsx    Redirects to /login if unauthenticated/
                        unonboarded; redirects to the right home if role
                        doesn't match the page
components/Sidebar.tsx    Role-aware nav; shows the signed-in user's real
                        name/photo, not a placeholder
lib/auth.tsx              AuthProvider — bridges Firebase auth state to the
                        backend profile (calls GET /profiles/me on every
                        auth state change)
lib/api.ts                 Thin fetch wrapper — attaches the current Firebase
                        ID token to every request; apiUpload() is a separate
                        path for multipart/form-data (file uploads) since it
                        must NOT set a Content-Type header
lib/firebase.ts             Client SDK init; connects to the Auth emulator
                        when NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
lib/countryCodes.ts          Dial-code list for the phone auth picker
lib/types.ts                  Mirrors backend/src/types/index.ts for the
                        frontend (kept in sync by hand, not generated)
```

Every dashboard page follows the same shape: a `RequireAuth`-wrapped default export around an inner `*Content` component that does its own `useEffect` fetch, with loading/error/empty states. There's no client-side data cache/store — each page fetches fresh on mount.

## Local development infrastructure

Two ways to run this locally, both documented in the README:

1. **Real Firebase project** — set real credentials in both `.env` files. Everything (Auth, Firestore, Storage) hits real Google Cloud services.
2. **Firebase Emulator Suite** (`firebase.json`, `.firebaserc`, `firestore.rules`) — Auth + Firestore emulators run entirely on your machine against a `demo-gighuz` project id, which the Firebase SDKs specifically recognize as emulator-only and skip real-credential validation for. The Firestore emulator needs a JVM; if you don't want a system install, a portable JDK zip extracted anywhere and put on `PATH` for the emulator process works without admin rights. `backend/scripts/seed-demo.js` populates working demo accounts directly via the Admin SDK (which bypasses Firestore security rules entirely, so `firestore.rules` can stay locked down — it's only relevant to code that isn't in this app, since the frontend never talks to Firestore directly).

CORS in `index.ts` explicitly allows both `localhost` and `127.0.0.1` (any port) in non-production — browsers treat these as different origins even though they're the same machine, and a strict single-string match makes every API call fail silently after a successful login.
