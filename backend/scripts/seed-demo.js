// One-off local seed script — creates demo accounts + sample data directly
// against the Firebase Auth/Firestore emulators. Not part of the TS build.
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8081';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

initializeApp({ projectId: 'demo-gighuz' });
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

  const recruiterUid = await upsertUser('demo.recruiter@gighuz.test', 'Demo1234!');
  const freelancerUid = await upsertUser('demo.freelancer@gighuz.test', 'Demo1234!');

  const recruiterId = 'demo-recruiter-1';
  await db.collection('recruiters').doc(recruiterId).set({
    id: recruiterId,
    uid: recruiterUid,
    role: 'recruiter',
    name: 'Dami Adeyemi',
    company: 'Northwind Digital',
    country: 'US',
    verified: true,
    totalSpent: 0,
    jobsPosted: 1,
    createdAt: now,
  }, { merge: true });

  const freelancerId = 'demo-freelancer-1';
  await db.collection('freelancers').doc(freelancerId).set({
    id: freelancerId,
    uid: freelancerUid,
    role: 'freelancer',
    name: 'Amara Osei',
    country: 'GH',
    bio: 'Full-stack developer with 4+ years building React and Node.js applications and REST APIs for global clients.',
    skills: ['React', 'TypeScript', 'Node.js', 'Tailwind CSS'],
    portfolioLinks: ['https://github.com/amara-dev'],
    expertiseClusterScore: 82,
    availability: 'open',
    verified: true,
    totalEarnings: 0,
    completedJobs: 3,
    averageRating: 4.8,
    ratingCount: 3,
    currency: 'USD',
    hourlyRate: 35,
    whatsappNumber: '+233201234567',
    createdAt: now,
  }, { merge: true });

  // A sample structured + matched job so the dashboards aren't empty
  const jobId = 'demo-job-1';
  const milestoneTemplateId = uuidv4();
  await db.collection('jobs').doc(jobId).set({
    id: jobId,
    recruiterId,
    title: 'Build a React dashboard with REST API integration',
    descriptionRaw: 'We need a responsive admin dashboard built in React with Tailwind CSS, connecting to our existing REST API. Should include auth, data tables, and charts.',
    structuredMilestones: [
      {
        id: milestoneTemplateId,
        name: 'Dashboard UI + API integration',
        deliverableDescription: 'Responsive dashboard with live data from the REST API',
        acceptanceCriteria: ['All endpoints connected', 'Responsive on mobile', 'Error states handled'],
        paymentAmountUsd: 450,
        durationDays: 10,
      },
    ],
    skillsRequired: ['React', 'TypeScript', 'Tailwind CSS'],
    budgetMinUsd: 400,
    budgetMaxUsd: 600,
    timelineDays: 10,
    status: 'matched',
    source: 'direct',
    matchedCandidateIds: [freelancerId],
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  // GigHuz's own first-party agent listings — seeded so the Agent Catalog
  // isn't empty on day one, using the same third-party invocation contract
  // (services/agentInvoker.ts) via routes/internalAgents.ts.
  const agentDevUid = await upsertUser('agents@gighuz.com', 'Demo1234!');
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

  const API_BASE = process.env.API_URL || 'http://localhost:8080';
  const INTERNAL_AGENT_SECRET = process.env.INTERNAL_AGENT_SECRET || 'dev-internal-agent-secret';

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

  console.log('\nSeeded demo accounts:');
  console.log('  Recruiter   demo.recruiter@gighuz.test  / Demo1234!');
  console.log('  Freelancer  demo.freelancer@gighuz.test / Demo1234!');
  console.log(`  Seeded ${firstPartyAgents.length} first-party GigHuz agent listings in the Agent Catalog.`);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
