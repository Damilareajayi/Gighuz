// Seeds ONLY the GigHuz-owned agent catalog (developer profile + 6 first-
// party AgentListing docs) against the REAL Firestore/Auth project — no
// demo recruiter/freelancer test accounts. Uses whatever credentials
// `gcloud auth application-default login` set up (Application Default
// Credentials), not the local emulators. Requires API_URL and
// INTERNAL_AGENT_SECRET env vars pointing at the real deployed backend.
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gighuz-app';
const API_BASE = process.env.API_URL;
const INTERNAL_AGENT_SECRET = process.env.INTERNAL_AGENT_SECRET;

if (!API_BASE) throw new Error('Set API_URL to the deployed backend URL before running this.');
if (!INTERNAL_AGENT_SECRET) throw new Error('Set INTERNAL_AGENT_SECRET to match what the Cloud Run service has configured.');

initializeApp({ projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

async function upsertUser(email, password) {
  try {
    const existing = await auth.getUserByEmail(email);
    return existing.uid;
  } catch {
    const user = await auth.createUser({ email, password, emailVerified: true });
    return user.uid;
  }
}

async function main() {
  const now = new Date().toISOString();

  const agentDevUid = await upsertUser('agents@gighuz.com', require('crypto').randomBytes(24).toString('hex'));
  const developerId = 'gighuz-agents';
  await db.collection('agentDevelopers').doc(developerId).set({
    id: developerId,
    uid: agentDevUid,
    role: 'agent_developer',
    name: 'GigHuz Agents',
    company: 'GigHuz',
    country: 'US',
    verified: true,
    totalEarnings: 0,
    completedTasks: 0,
    createdAt: now,
  }, { merge: true });

  const firstPartyAgents = [
    {
      slug: 'brand-identity', name: 'Brand Identity Agent', category: 'branding',
      description: 'Generates a brand voice, color direction, typography pairing, and dos/don\'ts from a short brief — a fast starting point for a new brand identity.',
      capabilities: ['brand voice', 'color palette', 'typography', 'brand guidelines'],
      pricePerTaskUsd: 15,
    },
    {
      slug: 'code-dev', name: 'Code Agent', category: 'software_development',
      description: 'Writes working code — features, scripts, or small apps — against a spec and its acceptance criteria, with a brief explanation of the approach.',
      capabilities: ['feature implementation', 'scripting', 'bug fixes', 'code review'],
      pricePerTaskUsd: 25,
    },
    {
      slug: 'presentation', name: 'Presentation Agent', category: 'presentation',
      description: 'Turns a topic and goal into a full slide-by-slide deck outline with content and speaker notes, ready to build out in your slide tool of choice.',
      capabilities: ['deck outlines', 'pitch decks', 'speaker notes', 'slide content'],
      pricePerTaskUsd: 20,
    },
    {
      slug: 'portfolio-site', name: 'Portfolio Site Agent', category: 'software_development',
      description: 'Builds a complete, responsive single-file portfolio website from a bio, work samples, and links — deployable as-is or as a starting point.',
      capabilities: ['portfolio websites', 'personal sites', 'responsive HTML/CSS'],
      pricePerTaskUsd: 30,
    },
    {
      slug: 'data-analysis', name: 'Data Analysis & Reporting Agent', category: 'data_analysis',
      description: 'Produces a business-analysis report: key metrics to track, a suggested dashboard layout, and actionable insights for tools like Power BI or Looker. Delivers the analysis and dashboard spec, not a generated .pbix file.',
      capabilities: ['data analysis', 'dashboard specs', 'reporting', 'business insights'],
      pricePerTaskUsd: 25,
    },
    {
      slug: 'seo-content', name: 'SEO & Content Agent', category: 'seo',
      description: 'Writes publish-ready SEO content — blog posts, landing page copy, product descriptions — complete with an SEO title and meta description.',
      capabilities: ['SEO writing', 'blog posts', 'landing page copy', 'meta descriptions'],
      pricePerTaskUsd: 15,
    },
  ];

  for (const agent of firstPartyAgents) {
    const id = `gighuz-agent-${agent.slug}`;
    await db.collection('agentListings').doc(id).set({
      id,
      developerId,
      name: agent.name,
      description: agent.description,
      category: agent.category,
      capabilities: agent.capabilities,
      endpointUrl: `${API_BASE}/api/internal-agents/${agent.slug}`,
      authHeader: INTERNAL_AGENT_SECRET,
      pricePerTaskUsd: agent.pricePerTaskUsd,
      status: 'active',
      completedTasks: 0,
      averageRating: 0,
      ratingCount: 0,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  console.log(`Seeded ${firstPartyAgents.length} first-party GigHuz agent listings into production Firestore (project: ${PROJECT_ID}).`);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
