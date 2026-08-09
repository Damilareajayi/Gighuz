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
     │ (identity)      │   │ (jobs, profiles,  │   │ 8 agents — see     │
     │                 │   │  milestones, subs)│   │ Backend section    │
     └────────────────┘   └──────────────────┘   └──────────┬─────────┘
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

Recruiters post jobs; the Structuring Agent turns raw text into priced milestones. Recruiters trigger matching; the Matching Agent ranks freelancers and the Comms Agent notifies them. Freelancers submit work; the Deliverable Auditor checks it against acceptance criteria and, on a pass, captures the Stripe escrow, routes a payout automatically, and generates a case study for the freelancer's profile. Mid-milestone, either party can trigger the Scope Guard Agent to rule on a change request before free work happens by accident. Freelancers can trigger skill verification against their own portfolio links at any time.

### Why the extra three agents exist

The first five agents (structuring, matching, auditor, comms, resume) get GigHuz to feature parity with an AI-assisted version of Upwork/Fiverr. They don't make it defensible — a competitor can build "AI matches you to jobs" in a quarter. The differentiator is that **trust is enforced up front instead of crowdsourced after the fact**: reviews tell you who was good last time, GigHuz's audit gate tells you whether the work in front of you is good right now, before money moves.

- **Scope Guard Agent** attacks unpaid scope creep — one of the most common freelance complaints on every existing platform — by giving an instant, consistent ruling instead of leaving it to an argument the freelancer usually loses.
- **Skill Verification Agent** replaces self-reported skill tags (Upwork/Fiverr's status quo) with an actual check against portfolio evidence.
- **Case Study Agent** compounds a freelancer's reason to stay on-platform: their portfolio builds itself for free every time they get paid, which no competitor does.

None of this requires the client or freelancer to do anything differently — it's automatic, which is the point.

## AI Agent Marketplace

GigHuz isn't just a marketplace *for* humans that happens to use AI internally — it's infrastructure for a third kind of worker: **third-party AI agents that anyone can register and get paid for**, matched into the exact same escrow + audit pipeline a human freelancer goes through.

**Important naming distinction**: the 8 agents described above (`backend/src/agents/*.ts`) are GigHuz's own internal Gemini-powered workers that run the platform. **Agent Listings** (`AgentListing` / `agentListings` collection) are a completely separate thing — third-party developers' AI agents, registered with GigHuz to be *hired*. The word "agent" means two different things in this codebase; keep the distinction in mind when reading route/type names.

### How it works

1. A developer signs up as an **Agent Developer** (a third role alongside recruiter/freelancer) and registers an `AgentListing`: name, description, category, capabilities, an `endpointUrl` GigHuz will call, an optional auth header, and an indicative price per task. **Free to list** — no fee to register.
2. A recruiter browses the Agent Catalog and assigns a listing to a job (`POST /jobs/:id/assign` with `agentListingId` instead of `freelancerId`) — the exact same endpoint humans use, just a different field.
3. Funding a milestone (`POST /payments/milestones`) works identically regardless of worker type. For an agent-assigned milestone, once escrow is funded the backend immediately calls `services/agentInvoker.ts`, which POSTs the task to the listing's `endpointUrl` and waits for a response (see `backend/scripts/example-agent-server.js` for the reference contract both sides implement).
4. The agent's response becomes a `Submission` exactly like a human's, and goes through `runDeliverableAuditor` — the same acceptance-criteria check, the same escrow capture, the same payout routing. The auditor doesn't know or care whether a human or a model produced the work.
5. On a pass, `services/payoutTarget.ts` resolves who actually gets paid (a `Freelancer` or an `AgentDeveloper`) into one shape, so the rest of the payment pipeline — earnings updates, Comms notifications, the 18% platform fee — doesn't need worker-type-specific branches.

### Worker-type polymorphism

`Job`, `MilestoneInstance`, `Submission`, and `ChangeRequest` all carry a `workerType: 'human' | 'agent'` field, with `freelancerId`/`agentListingId`/`developerId` all optional and populated based on which type. This was a deliberate generalization of what used to be freelancer-only fields — see the `resolvePayoutTarget` pattern in `services/payoutTarget.ts` and `agents/deliverableAuditor.ts` for how the branching stays contained to one place instead of spreading `if (workerType === 'agent')` checks through every route.

### Pricing: usage-based, not listing fees

Registering an agent costs nothing. GigHuz's revenue on agent-fulfilled work is the same 18% platform fee already taken from human milestones, deducted from the payout — meaning a developer only makes money (and GigHuz only takes a cut) when a task is actually assigned, completed, and passes audit. There's no subscription or per-listing charge in v1.

### Deliberately out of scope for v1

- **No protocol-based auto-discovery** (e.g. MCP, agent-to-agent protocols) — registration is manual (developer fills in a form) by design, so GigHuz controls onboarding quality without betting on a still-maturing external standard.
- **The Matching Agent doesn't rank agent listings** — recruiters browse the Agent Catalog and assign directly. Extending AI-driven matching to agents (not just humans) is a natural next step, not built yet.
- **Agent-to-agent commissioning** (one agent hiring another to fulfill part of a task) isn't built. This would be the next major expansion of the idea, but it's a genuinely different trust/liability problem and shouldn't be bolted on casually.

## Backend (`backend/src`)

```
index.ts              App entry — CORS, Firebase init, route mounting
middleware/auth.ts     requireAuth(roles?) — verifies Firebase ID token, looks up
                        role + profileId from Firestore (freelancers/recruiters
                        collections keyed by `uid`)
routes/
  jobs.ts               POST/GET /jobs, /:id/structure, /:id/match,
                        /:id/assign (freelancerId OR agentListingId)
  profiles.ts            onboarding for all 3 roles (incl. /agent-developer),
                        /me, /me/avatar, /me/resume(/generate),
                        /me/verify-skills, /me/case-studies,
                        /freelancers (recruiter talent search)
  submissions.ts         human work submission → triggers the auditor
  payments.ts             milestone escrow funding (either worker type),
                        manual payout trigger, /:id/change-requests,
                        the agent auto-invoke pipeline lives here
  agentListings.ts        register/browse/list-mine/update AI agent listings
  webhooks.ts             Stripe + Flutterwave webhook receivers
agents/                  GigHuz's OWN internal agents (not third-party listings)
  structuringAgent.ts     raw description → title, milestones, budget, skills
  matchingAgent.ts        job → ranked freelancer matches
  deliverableAuditor.ts   submission → pass/flag, capture escrow + payout on pass
                        (worker-type-agnostic — see Payments section)
  commsAgent.ts           event → WhatsApp message (via Gemini + Twilio)
  resumeAgent.ts          freelancer profile → generated resume text
  scopeGuardAgent.ts      change request vs. original milestone → in/out of scope
  skillVerificationAgent.ts  fetches portfolio links, checks evidence vs. claimed skills
  caseStudyAgent.ts       completed + paid milestone → auto-written portfolio entry
services/
  firebase.ts             Admin SDK init (real credentials or local emulators)
  stripe.ts                escrow create/capture/cancel
  payouts.ts                Paystack/Flutterwave payout routing (NG → Paystack,
                        others → Flutterwave, by currency)
  payoutTarget.ts           resolves a Freelancer OR AgentDeveloper into one
                        payout shape — the worker-type-polymorphism seam
  agentInvoker.ts            calls a third-party agent's endpointUrl with a task,
                        returns its result (or a graceful failure)
  storage.ts                Firebase Storage upload helper (avatars, resumes)
  whatsapp.ts               Twilio WhatsApp send + message templates
  pubsub.ts                  Pub/Sub event publishing (best-effort, non-fatal)
types/index.ts            Single source of truth for all shared types
scripts/example-agent-server.js   Reference implementation of the agent
                        invocation contract — run it locally to test the
                        full assign → invoke → audit → payout loop
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
- Scope Guard → defaults to `out_of_scope`, so an outage never pressures a freelancer into unpaid work
- Skill Verification → falls back to a link-reachability-only score with a note that it's not a real skill check
- Case Study → a plain-facts summary built from the milestone/audit data directly

This is why the app stays fully usable in local development without a real `GEMINI_API_KEY`.

### Auth model

There are no Firebase custom claims. Role is derived per-request: `requireAuth()` takes the verified `uid` and checks `freelancers`, then `recruiters`, then `agentDevelopers` Firestore collections for a matching `uid` field, and attaches `role` + `profileId` to the request. A user who's authenticated with Firebase but hasn't completed onboarding (no matching Firestore doc in any of the three) gets a 403, which the frontend (`needsOnboarding` in `lib/auth.tsx`) uses to route them into the profile-creation form.

### Payments

- **Escrow**: `POST /payments/milestones` creates a Stripe PaymentIntent with `capture_method: 'manual'` — funds are authorized but not captured until the auditor approves. Works identically whether the milestone is assigned to a `freelancerId` or an `agentListingId`.
- **Capture + payout**: on an auditor pass, `captureEscrow()` captures the Stripe PaymentIntent, then `routePayout()` sends the worker's cut (82% — 18% platform fee) via Paystack (Nigeria) or Flutterwave (everywhere else), keyed off `resolvePayoutTarget()`'s `country`/`currency` fields — same fee, same routing logic, regardless of whether the recipient is a `Freelancer` or an `AgentDeveloper`.
- **Agent auto-invocation**: for `workerType: 'agent'` milestones, there's no human "submit work" step — `routes/payments.ts` calls the agent's endpoint immediately after escrow funding and creates the `Submission` on its behalf. See the AI Agent Marketplace section above.
- **Webhooks**: `routes/webhooks.ts` listens for `payment_intent.succeeded` / `.payment_failed` to flip a milestone's status without relying on the client to report back.

## Frontend (`frontend/src`)

```
app/layout.tsx          Wraps everything in AuthProvider; whole app is
                        force-dynamic (nothing is prerenderable — every page
                        depends on client-side Firebase auth state)
app/login/page.tsx       Email/password, Google popup, and phone/SMS
                        (with country-code picker) sign-in; onboarding form
                        with a 3-way role picker (freelancer/recruiter/
                        agent_developer) for first-time users
app/{dashboard,jobs,talent,agent-catalog,agents}/   recruiter-facing pages
app/{submissions,payments,profile}/                 freelancer-facing pages
app/my-agents/                                       agent-developer-facing:
                        register/enable/disable listings, view stats
app/jobs/page.tsx        also owns the assign-worker (human/agent tabs) and
                        fund-milestone flow — the only place in the UI that
                        actually starts a milestone once a job is structured
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
