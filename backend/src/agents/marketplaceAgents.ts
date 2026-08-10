import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentInvocationRequest } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function briefFor(req: AgentInvocationRequest): string {
  return `
Task: ${req.title}

Brief: ${req.description}

Acceptance criteria:
${req.acceptanceCriteria.map((c) => `- ${c}`).join('\n') || '- (none specified)'}
`;
}

async function generate(systemPrompt: string, req: AgentInvocationRequest, fallback: () => string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  try {
    const result = await model.generateContent(`${systemPrompt}\n${briefFor(req)}`);
    const text = result.response.text().trim();
    if (!text) throw new Error('empty response');
    return text;
  } catch {
    return fallback();
  }
}

// ─── Brand Identity Agent ──────────────────────────────────────────────────

const BRAND_IDENTITY_PROMPT = `
You are GigHuz's Brand Identity Agent. Given the task brief below, produce a
concise brand identity package as plain text with these sections:
1. "NAME & TAGLINE" — a suggested name (only if none is given) and a one-line tagline
2. "BRAND VOICE" — 3-4 adjectives and a short paragraph describing tone
3. "COLOR DIRECTION" — 3-4 named colors with hex codes and when to use each
4. "TYPOGRAPHY" — a suggested heading + body font pairing and why
5. "DO / DON'T" — 3 quick dos and don'ts for staying on-brand
Keep the whole thing under 350 words. Be specific to the brief, not generic.
`;

export async function runBrandIdentityAgent(req: AgentInvocationRequest): Promise<string> {
  return generate(BRAND_IDENTITY_PROMPT, req, () => [
    `BRAND IDENTITY — ${req.title}`,
    '',
    'NAME & TAGLINE',
    `A tagline for "${req.title}" derived from: ${req.description.slice(0, 120)}`,
    '',
    'COLOR DIRECTION',
    '- Primary: #0F766E (teal) — trust, primary actions',
    '- Accent: #EA580C (orange) — energy, calls to action',
    '- Neutral: #1F2937 — text and structure',
    '',
    'TYPOGRAPHY',
    '- Headings: Inter Bold — clean, modern, highly legible',
    '- Body: Inter Regular — pairs cleanly across sizes',
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for a brief tailored to your description.)',
  ].join('\n'));
}

// ─── Code / Dev Agent ───────────────────────────────────────────────────────

const CODE_DEV_PROMPT = `
You are GigHuz's Code Agent. Given the task brief below, produce working code
that satisfies the acceptance criteria. Respond with:
1. A one-paragraph explanation of your approach
2. The code itself in a fenced code block with the correct language tag
3. A short "HOW TO RUN" note if relevant
Prefer widely-used, dependency-light solutions. If the brief is ambiguous,
state your assumptions briefly before the code rather than asking questions.
`;

export async function runCodeDevAgent(req: AgentInvocationRequest): Promise<string> {
  return generate(CODE_DEV_PROMPT, req, () => [
    `# ${req.title}`,
    '',
    'AI generation is temporarily unavailable, so here is a scaffold to start from:',
    '',
    '```',
    `// TODO: implement — ${req.description}`,
    '// Acceptance criteria:',
    ...req.acceptanceCriteria.map((c) => `// - ${c}`),
    '```',
    '',
    'Retry the task once the AI service is available for a full implementation.',
  ].join('\n'));
}

// ─── Presentation / Deck Agent ─────────────────────────────────────────────

const PRESENTATION_PROMPT = `
You are GigHuz's Presentation Agent. Given the task brief below, produce a
full slide-by-slide deck outline as plain text. For each slide, output:
"Slide N: <title>" followed by 3-5 bullet points of content and, where
useful, a one-line "Speaker note:". Aim for 8-12 slides: a title slide, an
agenda/problem framing, core content slides driven by the brief, and a
closing/CTA slide. Be specific to the brief, not generic filler.
`;

export async function runPresentationAgent(req: AgentInvocationRequest): Promise<string> {
  return generate(PRESENTATION_PROMPT, req, () => [
    `Slide 1: ${req.title}`,
    '- Subtitle drawn from the brief',
    '- Presenter / date placeholder',
    '',
    'Slide 2: Overview',
    `- ${req.description.slice(0, 150)}`,
    '',
    ...req.acceptanceCriteria.map((c, i) => `Slide ${i + 3}: ${c}\n- Supporting detail for this point\n`),
    '(AI generation unavailable — this is a deterministic outline. Retry for a full tailored deck.)',
  ].join('\n'));
}

// ─── Portfolio Website Agent ────────────────────────────────────────────────

const PORTFOLIO_SITE_PROMPT = `
You are GigHuz's Portfolio Site Agent. Given the task brief below (which
describes a person's background, work samples, and links), produce a
complete, single-file, responsive portfolio website as plain HTML with
inline CSS (no external dependencies). Include: a hero section with name and
one-line positioning, an about/bio section, a work/projects section, and a
contact section with any links mentioned in the brief. Respond with a short
one-line intro sentence, then the full HTML in a single fenced code block.
`;

export async function runPortfolioSiteAgent(req: AgentInvocationRequest): Promise<string> {
  return generate(PORTFOLIO_SITE_PROMPT, req, () => [
    'AI generation is temporarily unavailable, so here is a minimal scaffold to start from:',
    '',
    '```html',
    '<!doctype html>',
    '<html><head><meta charset="utf-8"><title>Portfolio</title></head>',
    '<body>',
    `  <h1>${req.title}</h1>`,
    `  <p>${req.description.slice(0, 200)}</p>`,
    '  <!-- TODO: about, projects, contact sections -->',
    '</body></html>',
    '```',
    '',
    'Retry the task once the AI service is available for a full tailored site.',
  ].join('\n'));
}

// ─── Data Analysis & Reporting Agent ───────────────────────────────────────
// Note: produces a written analysis + chart-ready JSON series, not a native
// .pbix file — GigHuz doesn't yet integrate the Power BI REST API.

const DATA_ANALYSIS_PROMPT = `
You are GigHuz's Data Analysis & Reporting Agent. Given the task brief below,
produce a business-analysis report as plain text with these sections:
1. "KEY METRICS TO TRACK" — 4-6 metrics relevant to the brief, each with a one-line definition
2. "SUGGESTED DASHBOARD LAYOUT" — describe 3-4 panels/charts a dashboard tool (e.g. Power BI, Looker) should show, chart type and what it reveals
3. "INSIGHTS & RECOMMENDATIONS" — 3-4 actionable takeaways, reasoned from the brief
4. "SAMPLE DAX / QUERY LOGIC" — one illustrative measure or query relevant to the brief, described in plain terms
Be specific to the brief. Note clearly that this is analysis and a build spec,
not a generated .pbix file — the client's own data source still needs to be connected.
`;

export async function runDataAnalysisAgent(req: AgentInvocationRequest): Promise<string> {
  return generate(DATA_ANALYSIS_PROMPT, req, () => [
    `DATA ANALYSIS & REPORTING — ${req.title}`,
    '',
    'KEY METRICS TO TRACK',
    '- Define 4-6 metrics once the brief and data source are available',
    '',
    'SUGGESTED DASHBOARD LAYOUT',
    '- Trend panel (line chart) — track the primary metric over time',
    '- Breakdown panel (bar chart) — segment by the brief\'s key dimension',
    '',
    'Note: this is an analysis and dashboard-build spec, not a generated .pbix file.',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for analysis tailored to your brief.)',
  ].join('\n'));
}

// ─── SEO / Content Writing Agent ───────────────────────────────────────────

const SEO_CONTENT_PROMPT = `
You are GigHuz's SEO & Content Agent. Given the task brief below, produce a
publish-ready piece of written content that satisfies the acceptance
criteria — this may be a blog post, landing page copy, or product
description depending on the brief. Include an SEO title (under 60 chars)
and meta description (under 155 chars) before the content. Write in a clear,
engaging tone matched to the brief's apparent audience.
`;

export async function runSeoContentAgent(req: AgentInvocationRequest): Promise<string> {
  return generate(SEO_CONTENT_PROMPT, req, () => [
    `SEO TITLE: ${req.title.slice(0, 60)}`,
    `META DESCRIPTION: ${req.description.slice(0, 150)}`,
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for content tailored to your brief.)',
  ].join('\n'));
}
