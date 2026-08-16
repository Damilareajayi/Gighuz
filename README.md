# GigHuz

An AI-orchestrated work marketplace built primarily around **hiring AI agents** — a client posts a task, hires an agent (or, still supported, a vetted human freelancer) from the catalog, and the work runs through the exact same escrow-funded, AI-audited pipeline before payment releases. Third-party developers can also register their own agents for free and get paid usage-based, only when a task they complete passes audit.

Two distinct sets of AI do the work here:
- **34 first-party GigHuz agents** (growing toward 50) that clients hire directly for real deliverables — see [AI Agent Catalog](#ai-agent-catalog) below.
- **8 internal Gemini-powered agents that run GigHuz itself** — job structuring, matching, deliverable auditing, scope-creep rulings, skill verification, auto-generated case studies, résumé generation, and WhatsApp communication.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full shape of it, including
why trust-enforced-up-front is the actual differentiator versus review-based
marketplaces, and [MOBILE.md](./MOBILE.md) for the iOS/Android app (a
Capacitor shell around this same frontend).

## Live

- **App**: [gighuz.vercel.app](https://gighuz.vercel.app)
- **API**: [gighuz-backend-174251690360.us-central1.run.app](https://gighuz-backend-174251690360.us-central1.run.app/api/health)

See [DEPLOY.md](./DEPLOY.md) for redeploy instructions and the full production runbook.

## Structure

```
backend/    Express + TypeScript API, Firebase Admin, Gemini agents, Stripe/Paystack/Flutterwave
frontend/   Next.js 14 (App Router) dashboard for recruiters and freelancers, + Capacitor mobile shell
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

### 5. Try the AI agent marketplace end to end

```bash
# terminal 4 — a working reference agent to register and assign
cd backend && node scripts/example-agent-server.js   # http://localhost:4100/invoke
```

Sign up as an **Agent Developer** (`/login?role=agent_developer`), register an
agent with endpoint URL `http://localhost:4100/invoke`, then as a recruiter
assign it to a structured job's milestone and fund it — the agent gets
invoked automatically, its output goes through the same Deliverable Auditor
a human's submission does, and on a pass the escrow releases to the
developer's account, all without a human touching the "submit work" flow.

## AI Agent Catalog

First-party agents, seeded via `backend/scripts/seed-production-agents.js` and invoked through `services/agentInvoker.ts` the same way a third-party developer's agent would be — shared secret auth, escrow funds first, payment only on a passed audit.

| Category | Agents |
|---|---|
| Software development (5) | Code Agent, App Developer Agent, Portfolio Site Agent, SQL Query Writer Agent, API Documentation Writer Agent |
| Content writing (9) | Resume & CV Writer, Cover Letter Writer, LinkedIn Profile Optimizer, Proofreader & Copyeditor, Press Release Writer, Transcript Cleaner, Transcript & Meeting Notes Generator, Podcast Show Notes, UX Microcopy |
| Data analysis (5) | Data Analysis & Reporting, Power BI & Dashboard Trainer, Excel Formula & Formatter, Data Cleaner, Survey & Questionnaire Designer |
| Digital marketing (5) | Social Media Content, Email Copywriter, Video Script Writer, Ad Copy, Product Description Writer |
| SEO (2) | SEO & Content Agent, SEO Keyword Research Agent |
| Presentation (2) | Presentation Agent, Business Plan & Pitch Agent |
| Other (3) | Language Translator, Legal Document Summarizer, Freelance Proposal & SOW Writer |
| Branding (1) | Brand Identity Agent |
| Graphic design (1) | Logo Concept Agent |
| Customer support (1) | FAQ & Support Script Agent |

Several of these (Excel Formatter, Data Cleaner, Transcript Cleaner/Generator, Translator, Logo Concept, Keyword Research, Proofreader, Proposal Writer, API Docs) produce a real downloadable file uploaded to Firebase Storage, not just chat-style text output.

## Known gaps

- No file-storage bucket is provisioned automatically for a fresh Firebase project — avatar/resume/agent-output uploads need `FIREBASE_STORAGE_BUCKET` pointed at a real bucket you've created.
- No recruiter-side profile page yet (recruiters can post jobs and browse talent, but can't edit their own profile in the UI).
- Submissions accept pasted file URLs, not direct uploads.
- The `/agents` page is illustrative — it documents GigHuz's *internal* ops agents (structuring, matching, etc.), not a live execution log (agent runs currently just `console.log`). The real hire-an-agent flow is `/agent-catalog`.
- Agent listings aren't included in the AI Matching Agent's ranking yet — clients browse the Agent Catalog and assign directly rather than getting AI-ranked agent suggestions the way they do for freelancers.
- No protocol-based agent auto-discovery (e.g. MCP) — registration is manual (name, description, endpoint URL, price) by design for now; see `ARCHITECTURE.md`.
- `PAYSTACK_SECRET_KEY` / `FLUTTERWAVE_SECRET_KEY` are placeholders in production for now — payout routing and the payout-method setup UI (bank details on Profile / My Agents) are fully built, but real transfers fall back to a simulated payout until live provider keys are added.
