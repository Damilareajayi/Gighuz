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
    {
      slug: 'app-developer', name: 'App Developer Agent', category: 'software_development',
      description: 'Builds a small, complete working app — usually a single-file web app — from a brief, with real functionality, not just a shell.',
      capabilities: ['app development', 'web apps', 'prototypes', 'MVPs'],
      pricePerTaskUsd: 35,
    },
    {
      slug: 'powerbi-trainer', name: 'Power BI & Dashboard Trainer Agent', category: 'data_analysis',
      description: 'A hands-on, step-by-step Power BI walkthrough for your specific report — data model, build steps, key DAX measures, and common pitfalls.',
      capabilities: ['Power BI training', 'DAX formulas', 'dashboard design', 'data modeling'],
      pricePerTaskUsd: 20,
    },
    {
      slug: 'excel-formatter', name: 'Excel Formula & Formatter Agent', category: 'data_analysis',
      description: 'Writes the Excel/Sheets formulas you need and delivers a ready-to-use CSV template built around your brief.',
      capabilities: ['Excel formulas', 'Google Sheets', 'spreadsheet templates', 'formatting'],
      pricePerTaskUsd: 12,
    },
    {
      slug: 'data-cleaner', name: 'Data Cleaner Agent', category: 'data_analysis',
      description: 'Cleans messy data — inconsistent formatting, duplicates, missing values — and delivers a ready-to-use CSV.',
      capabilities: ['data cleaning', 'deduplication', 'CSV export', 'data validation'],
      pricePerTaskUsd: 15,
    },
    {
      slug: 'transcript-cleaner', name: 'Transcript Cleaner Agent', category: 'content_writing',
      description: 'Cleans up a raw transcript — punctuation, filler words, speaker labels — and delivers a polished downloadable version.',
      capabilities: ['transcript editing', 'punctuation cleanup', 'speaker labeling'],
      pricePerTaskUsd: 12,
    },
    {
      slug: 'transcript-generator', name: 'Transcript & Meeting Notes Generator Agent', category: 'content_writing',
      description: 'Turns a meeting outline or rough notes into a structured notes document with key points and action items. Generated from your outline, not transcribed from real audio.',
      capabilities: ['meeting notes', 'action items', 'structured notes'],
      pricePerTaskUsd: 12,
    },
    {
      slug: 'translator', name: 'Language Translator Agent', category: 'other',
      description: 'Translates text into your target language, preserving tone and formatting, and delivers it as a downloadable file.',
      capabilities: ['translation', 'localization', 'multilingual content'],
      pricePerTaskUsd: 10,
    },
    {
      slug: 'legal-summarizer', name: 'Legal Document Summarizer Agent', category: 'other',
      description: 'Summarizes a contract or legal document into plain English — key terms and things worth a closer look. Orientation only, not legal advice.',
      capabilities: ['contract summaries', 'plain-English translation', 'terms review'],
      pricePerTaskUsd: 18,
    },
    {
      slug: 'resume-writer', name: 'Resume & CV Writer Agent', category: 'content_writing',
      description: 'Writes a polished, ATS-friendly resume from your background and target role, using only what you actually provide.',
      capabilities: ['resume writing', 'CV writing', 'ATS optimization'],
      pricePerTaskUsd: 15,
    },
    {
      slug: 'social-media', name: 'Social Media Content Agent', category: 'digital_marketing',
      description: 'Plans a week of social content — captions, hashtags, and creative direction — for your brand or product.',
      capabilities: ['social media', 'content calendar', 'captions', 'hashtags'],
      pricePerTaskUsd: 15,
    },
    {
      slug: 'email-copywriter', name: 'Email Copywriter Agent', category: 'digital_marketing',
      description: 'Writes a complete email — subject line, preview text, body, and call to action — for outreach, launches, or newsletters.',
      capabilities: ['email copywriting', 'cold outreach', 'newsletters'],
      pricePerTaskUsd: 12,
    },
    {
      slug: 'business-plan', name: 'Business Plan & Pitch Agent', category: 'presentation',
      description: 'Turns a business idea into a lean plan outline — problem, solution, market, business model, go-to-market, and honest risks.',
      capabilities: ['business plans', 'pitch decks', 'startup strategy'],
      pricePerTaskUsd: 20,
    },
    {
      slug: 'video-script', name: 'Video Script Writer Agent', category: 'digital_marketing',
      description: 'Writes a complete video script — hook, visuals, voiceover/dialogue, and CTA — paced for your platform, from YouTube to TikTok to ads.',
      capabilities: ['video scripts', 'YouTube', 'TikTok', 'ad scripts'],
      pricePerTaskUsd: 18,
    },
    {
      slug: 'podcast-notes', name: 'Podcast Show Notes Agent', category: 'content_writing',
      description: 'Turns an episode topic or rough outline into publish-ready show notes — summary, topics discussed, key quotes, and linked resources.',
      capabilities: ['show notes', 'podcast summaries', 'episode descriptions'],
      pricePerTaskUsd: 10,
    },
    {
      slug: 'logo-concept', name: 'Logo Concept Agent', category: 'graphic_design',
      description: 'Designs a simple, original logo concept as a clean scalable SVG from your brand name, industry, and style preference — a fast starting concept, not a final asset.',
      capabilities: ['logo design', 'brand marks', 'SVG concepts'],
      pricePerTaskUsd: 20,
    },
    {
      slug: 'ux-microcopy', name: 'UX Microcopy Agent', category: 'content_writing',
      description: 'Writes the actual interface copy for your product flow — button labels, empty states, error messages — with rationale for tone.',
      capabilities: ['UX writing', 'microcopy', 'interface copy'],
      pricePerTaskUsd: 15,
    },
    {
      slug: 'cover-letter', name: 'Cover Letter Writer Agent', category: 'content_writing',
      description: 'Writes a genuine, specific cover letter connecting your real experience to the role you\'re applying for — no generic filler.',
      capabilities: ['cover letters', 'job applications'],
      pricePerTaskUsd: 12,
    },
    {
      slug: 'linkedin-optimizer', name: 'LinkedIn Profile Optimizer Agent', category: 'content_writing',
      description: 'Rewrites your LinkedIn headline, About section, and featured skills to actually get noticed — based only on your real background.',
      capabilities: ['LinkedIn optimization', 'personal branding', 'profile writing'],
      pricePerTaskUsd: 15,
    },
    {
      slug: 'ad-copy', name: 'Ad Copy Agent', category: 'digital_marketing',
      description: 'Writes ready-to-run ad variants for Google Search or social feed placements — headlines, descriptions, and full copy variants.',
      capabilities: ['ad copy', 'Google Ads', 'Meta Ads', 'paid social'],
      pricePerTaskUsd: 15,
    },
    {
      slug: 'support-script', name: 'FAQ & Support Script Agent', category: 'customer_support',
      description: 'Builds a realistic FAQ and scripted support responses for tricky situations — refunds, delays, complaints — matched to your product.',
      capabilities: ['FAQ writing', 'support scripts', 'customer service'],
      pricePerTaskUsd: 15,
    },
    {
      slug: 'product-description', name: 'Product Description Writer Agent', category: 'digital_marketing',
      description: 'Writes ecommerce-ready product copy — hook, features-to-benefits, and SEO tags — without inventing specs you didn\'t give it.',
      capabilities: ['product descriptions', 'ecommerce copy', 'SEO tags'],
      pricePerTaskUsd: 10,
    },
    {
      slug: 'keyword-research', name: 'SEO Keyword Research Agent', category: 'seo',
      description: 'Builds a keyword research table — intent, difficulty, suggested use — as a ready-to-use CSV for your content or site.',
      capabilities: ['keyword research', 'SEO strategy', 'CSV export'],
      pricePerTaskUsd: 15,
    },
    {
      slug: 'proofreader', name: 'Proofreader & Copyeditor Agent', category: 'content_writing',
      description: 'Proofreads and tightens your writing — grammar, spelling, awkward phrasing — while preserving your voice, delivered as a clean file.',
      capabilities: ['proofreading', 'copyediting', 'grammar'],
      pricePerTaskUsd: 10,
    },
    {
      slug: 'proposal-writer', name: 'Freelance Proposal & SOW Writer Agent', category: 'other',
      description: 'Drafts a client-ready proposal — scope, timeline, pricing, next steps — from a project brief, delivered as a downloadable document.',
      capabilities: ['proposals', 'statements of work', 'client documents'],
      pricePerTaskUsd: 18,
    },
    {
      slug: 'survey-designer', name: 'Survey & Questionnaire Designer Agent', category: 'data_analysis',
      description: 'Designs a complete, well-ordered survey — question types, logical flow, under 5 minutes to complete — for any research goal.',
      capabilities: ['survey design', 'market research', 'questionnaires'],
      pricePerTaskUsd: 12,
    },
    {
      slug: 'press-release', name: 'Press Release Writer Agent', category: 'content_writing',
      description: 'Writes an AP-style press release for a launch, funding round, partnership, or milestone — headline, lead, quote, and boilerplate.',
      capabilities: ['press releases', 'PR', 'announcements'],
      pricePerTaskUsd: 18,
    },
    {
      slug: 'sql-query', name: 'SQL Query Writer Agent', category: 'software_development',
      description: 'Writes the SQL query that answers your data question from a plain-English description and (optional) schema.',
      capabilities: ['SQL', 'database queries', 'data retrieval'],
      pricePerTaskUsd: 15,
    },
    {
      slug: 'api-docs', name: 'API Documentation Writer Agent', category: 'software_development',
      description: 'Turns endpoint descriptions into clean Markdown API docs — parameters, example requests, and example responses.',
      capabilities: ['API documentation', 'technical writing', 'Markdown'],
      pricePerTaskUsd: 18,
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
