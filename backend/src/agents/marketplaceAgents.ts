import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentInvocationRequest } from '../types';
import { uploadFile } from '../services/storage';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface AgentRunResult {
  output: string;
  outputUrls: string[];
}

function briefFor(req: AgentInvocationRequest): string {
  return `
Task: ${req.title}

Brief: ${req.description}

Acceptance criteria:
${req.acceptanceCriteria.map((c) => `- ${c}`).join('\n') || '- (none specified)'}
`;
}

async function callGemini(systemPrompt: string, req: AgentInvocationRequest): Promise<string | null> {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  try {
    const result = await model.generateContent(`${systemPrompt}\n${briefFor(req)}`);
    const text = result.response.text().trim();
    return text || null;
  } catch {
    return null;
  }
}

async function generate(systemPrompt: string, req: AgentInvocationRequest, fallback: () => string): Promise<AgentRunResult> {
  const text = await callGemini(systemPrompt, req);
  return { output: text ?? fallback(), outputUrls: [] };
}

// Pulls the deliverable out of a model response that may contain several
// fenced code blocks (e.g. formula snippets AND a csv block) -- prompts ask
// for the actual file content tagged with a specific language, so this
// looks for that tag specifically rather than just grabbing the first
// fenced block, which was pulling out formula examples instead of the CSV
// on early testing. Falls back to the last fenced block of any kind, then
// the whole response, if the tagged block isn't found.
function extractFencedBlock(text: string, lang: string): string {
  const tagged = new RegExp('```' + lang + '\\r?\\n([\\s\\S]*?)```', 'i').exec(text);
  if (tagged) return tagged[1].trim();

  const anyBlocks = [...text.matchAll(/```[a-zA-Z]*\r?\n([\s\S]*?)```/g)];
  if (anyBlocks.length > 0) return anyBlocks[anyBlocks.length - 1][1].trim();

  return text.trim();
}

// Generates a file-shaped deliverable and uploads it to Storage. Degrades
// gracefully to text-only output (no outputUrls) if Storage is unavailable
// for any reason -- an agent should never hard-fail just because export
// isn't reachable, same fallback philosophy as every other agent here.
async function generateFile(
  systemPrompt: string,
  req: AgentInvocationRequest,
  fallback: () => string,
  file: { slug: string; extension: string; mimeType: string; lang: string; introText: (content: string) => string }
): Promise<AgentRunResult> {
  const text = await callGemini(systemPrompt, req);
  const raw = text ?? fallback();
  const fileContent = extractFencedBlock(raw, file.lang);

  try {
    const url = await uploadFile(
      `agent-outputs/${file.slug}`,
      Buffer.from(fileContent, 'utf-8'),
      file.mimeType,
      file.extension
    );
    return { output: file.introText(fileContent), outputUrls: [url] };
  } catch (err) {
    console.warn(`[marketplaceAgents] file upload failed for ${file.slug}, returning text only:`, err);
    return { output: raw, outputUrls: [] };
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

export async function runBrandIdentityAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
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

export async function runCodeDevAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
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

export async function runPresentationAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
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

export async function runPortfolioSiteAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
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

export async function runDataAnalysisAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
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

export async function runSeoContentAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(SEO_CONTENT_PROMPT, req, () => [
    `SEO TITLE: ${req.title.slice(0, 60)}`,
    `META DESCRIPTION: ${req.description.slice(0, 150)}`,
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for content tailored to your brief.)',
  ].join('\n'));
}

// ─── App Developer Agent ───────────────────────────────────────────────────

const APP_DEVELOPER_PROMPT = `
You are GigHuz's App Developer Agent. Given the task brief below, build a
small, complete, working application that satisfies it — prefer a
single-file HTML/CSS/JS web app unless the brief clearly calls for
something else (e.g. a script, a small API). Respond with:
1. A short paragraph on the approach and any assumptions made
2. The full app code in one fenced code block
3. A "HOW TO RUN" note
This is for a working starting app, not a snippet — include real
functionality (state, interactions, basic styling), not just a shell.
`;

export async function runAppDeveloperAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(APP_DEVELOPER_PROMPT, req, () => [
    `# ${req.title}`,
    '',
    'AI generation is temporarily unavailable, so here is a scaffold to start from:',
    '```html',
    '<!doctype html><html><body><h1>' + req.title + '</h1><!-- TODO: build app --></body></html>',
    '```',
    'Retry the task once the AI service is available for a full working app.',
  ].join('\n'));
}

// ─── Power BI & Dashboard Trainer Agent ────────────────────────────────────

const POWERBI_TRAINER_PROMPT = `
You are GigHuz's Power BI & Dashboard Trainer Agent. Given the task brief
below, produce a hands-on Power BI walkthrough as plain text:
1. "WHAT YOU'LL BUILD" — one-line description of the end result
2. "DATA MODEL" — suggested tables/relationships for this brief
3. "STEP-BY-STEP" — numbered steps to build the report in Power BI Desktop (data load, transforms, visuals, formatting)
4. "KEY DAX MEASURES" — 2-3 actual DAX formulas relevant to the brief, each with a one-line explanation
5. "COMMON PITFALLS" — 2-3 mistakes beginners make on this kind of report
Be concrete and specific to the brief, written for someone learning Power BI, not an expert.
`;

export async function runPowerBiTrainerAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(POWERBI_TRAINER_PROMPT, req, () => [
    `POWER BI WALKTHROUGH — ${req.title}`,
    '',
    'STEP-BY-STEP',
    '1. Load your data source in Power Query',
    '2. Model relationships between tables',
    '3. Build visuals against the brief\'s key metrics',
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for a walkthrough tailored to your brief.)',
  ].join('\n'));
}

// ─── Excel Formula & Formatter Agent ───────────────────────────────────────

const EXCEL_FORMULA_PROMPT = `
You are GigHuz's Excel Formula & Formatter Agent. Given the task brief
below, produce:
1. A short explanation of the approach
2. The actual Excel/Google Sheets formulas needed, each on its own line with a one-line comment
3. A CSV template matching the brief — realistic column headers and 3-5 example rows — inside a single fenced code block tagged "csv"
Keep the CSV strictly comma-separated with a header row; no extra commentary inside the fenced block.
`;

export async function runExcelFormulaAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generateFile(EXCEL_FORMULA_PROMPT, req, () => [
    '```csv',
    'Column A,Column B,Column C',
    'Example,123,2026-01-01',
    '```',
  ].join('\n'), {
    slug: 'excel-formatter',
    extension: 'csv',
    mimeType: 'text/csv',
    lang: 'csv',
    introText: (csv) => `Built a spreadsheet template for "${req.title}" — download it and adapt the formulas to your real data.\n\nPreview:\n${csv.split('\n').slice(0, 4).join('\n')}`,
  });
}

// ─── Data Cleaner Agent ─────────────────────────────────────────────────────

const DATA_CLEANER_PROMPT = `
You are GigHuz's Data Cleaner Agent. The task brief (and any pasted sample
data within it) describes messy data that needs cleaning — inconsistent
formatting, duplicates, missing values, bad types. Respond with:
1. A short summary of the cleaning steps you applied
2. The cleaned data as CSV (header row + all rows), inside a single fenced code block tagged "csv"
If no literal sample data was pasted in the brief, generate a small
realistic example dataset matching the brief and clean that instead, and
say so clearly in your summary.
`;

export async function runDataCleanerAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generateFile(DATA_CLEANER_PROMPT, req, () => [
    '```csv',
    'id,value,date',
    '1,100,2026-01-01',
    '```',
  ].join('\n'), {
    slug: 'data-cleaner',
    extension: 'csv',
    mimeType: 'text/csv',
    lang: 'csv',
    introText: (csv) => `Cleaned dataset for "${req.title}" ready to download.\n\nPreview:\n${csv.split('\n').slice(0, 4).join('\n')}`,
  });
}

// ─── Transcript Cleaner Agent ───────────────────────────────────────────────

const TRANSCRIPT_CLEANER_PROMPT = `
You are GigHuz's Transcript Cleaner Agent. The task brief contains a raw,
messy transcript (filler words, false starts, inconsistent speaker labels,
missing punctuation). Clean it up: fix punctuation and casing, remove filler
words ("um", "uh", false starts) without changing meaning, and normalize
speaker labels (e.g. "Speaker 1:", "Speaker 2:") if multiple speakers are
present. Respond with a one-line summary of what you changed, then the full
cleaned transcript inside a single fenced code block tagged "text".
`;

export async function runTranscriptCleanerAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generateFile(TRANSCRIPT_CLEANER_PROMPT, req, () => [
    '```text',
    req.description,
    '```',
  ].join('\n'), {
    slug: 'transcript-cleaner',
    extension: 'txt',
    mimeType: 'text/plain',
    lang: 'text',
    introText: (txt) => `Cleaned transcript for "${req.title}" ready to download.\n\nPreview:\n${txt.slice(0, 300)}${txt.length > 300 ? '…' : ''}`,
  });
}

// ─── Transcript & Meeting Notes Generator Agent ────────────────────────────
// Note: generates a structured transcript/notes document from an outline or
// description -- GigHuz doesn't integrate real speech-to-text, so this
// doesn't process actual audio/video.

const TRANSCRIPT_GENERATOR_PROMPT = `
You are GigHuz's Transcript & Meeting Notes Generator Agent. Given a brief
description or outline of a meeting, interview, or discussion, produce a
structured notes document: an "ATTENDEES / CONTEXT" line if inferable, then
"KEY POINTS" as bullets grouped by topic, then "ACTION ITEMS" as a checklist
with owners if mentioned. This is generated from the outline provided, not
transcribed from real audio — say so briefly at the top. Respond with the
document inside a single fenced code block tagged "text".
`;

export async function runTranscriptGeneratorAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generateFile(TRANSCRIPT_GENERATOR_PROMPT, req, () => [
    '```text',
    `Generated from outline, not real audio.\n\nKEY POINTS\n- ${req.description.slice(0, 200)}\n\nACTION ITEMS\n- [ ] Follow up`,
    '```',
  ].join('\n'), {
    slug: 'transcript-generator',
    extension: 'txt',
    mimeType: 'text/plain',
    lang: 'text',
    introText: (txt) => `Meeting notes document for "${req.title}" ready to download.\n\nPreview:\n${txt.slice(0, 300)}${txt.length > 300 ? '…' : ''}`,
  });
}

// ─── Language Translator Agent ─────────────────────────────────────────────

const TRANSLATOR_PROMPT = `
You are GigHuz's Language Translator Agent. The task brief specifies source
text and a target language (from the title, description, or acceptance
criteria). Translate the text faithfully, preserving tone and formatting.
Respond with the target language you translated into on the first line,
then the translated text inside a single fenced code block tagged "text".
If the target language isn't clear from the brief, default to Spanish and
say so on the first line.
`;

export async function runTranslatorAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generateFile(TRANSLATOR_PROMPT, req, () => [
    '```text',
    req.description,
    '```',
  ].join('\n'), {
    slug: 'translator',
    extension: 'txt',
    mimeType: 'text/plain',
    lang: 'text',
    introText: (txt) => `Translation for "${req.title}" ready to download.\n\nPreview:\n${txt.slice(0, 300)}${txt.length > 300 ? '…' : ''}`,
  });
}

// ─── Legal Document Summarizer Agent ───────────────────────────────────────
// Note: plain-English summarization for orientation only -- not legal advice.

const LEGAL_SUMMARIZER_PROMPT = `
You are GigHuz's Legal Document Summarizer Agent. The task brief contains
(or describes) a contract, terms of service, or other legal document.
Produce a plain-English summary: "WHAT THIS DOCUMENT IS", "KEY TERMS" (5-8
bullets on obligations, payment, duration, termination, liability as
applicable), and "THINGS TO WATCH" (clauses worth a closer look or a real
lawyer's attention). Start with a one-line disclaimer that this is a plain-
English summary for orientation, not legal advice.
`;

export async function runLegalSummarizerAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(LEGAL_SUMMARIZER_PROMPT, req, () => [
    'This is a plain-English summary for orientation, not legal advice.',
    '',
    `WHAT THIS DOCUMENT IS — related to: ${req.title}`,
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for a summary tailored to your document.)',
  ].join('\n'));
}

// ─── Resume & CV Writer Agent ───────────────────────────────────────────────

const RESUME_WRITER_PROMPT = `
You are GigHuz's Resume & CV Writer Agent. Given a brief describing someone's
background, skills, and target role, write a polished, ATS-friendly resume
in plain text: a 2-3 sentence professional summary, then "EXPERIENCE",
"SKILLS", and "EDUCATION" sections (omit any section with no information
given — don't invent employers, dates, or credentials not in the brief).
Keep it under 400 words.
`;

export async function runResumeWriterAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(RESUME_WRITER_PROMPT, req, () => [
    `RESUME — ${req.title}`,
    '',
    req.description,
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for a resume tailored to your background.)',
  ].join('\n'));
}

// ─── Social Media Content Agent ────────────────────────────────────────────

const SOCIAL_MEDIA_PROMPT = `
You are GigHuz's Social Media Content Agent. Given a brief describing a
brand, product, or message, produce a week's worth of social content: 5
post ideas, each with a platform-appropriate caption (adapt tone per
platform if multiple are implied), 3-5 relevant hashtags, and a one-line
visual/creative direction. Format as a numbered list.
`;

export async function runSocialMediaAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(SOCIAL_MEDIA_PROMPT, req, () => [
    `SOCIAL CONTENT — ${req.title}`,
    '',
    `1. Post idea based on: ${req.description.slice(0, 150)}`,
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for content tailored to your brief.)',
  ].join('\n'));
}

// ─── Email Copywriter Agent ─────────────────────────────────────────────────

const EMAIL_COPYWRITER_PROMPT = `
You are GigHuz's Email Copywriter Agent. Given a brief describing the goal
(cold outreach, product launch, newsletter, etc.) and audience, write a
complete email: subject line, preview text, and body copy with a clear call
to action. Match tone to the apparent audience and keep the body under 200
words unless the brief calls for more detail.
`;

export async function runEmailCopywriterAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(EMAIL_COPYWRITER_PROMPT, req, () => [
    `SUBJECT: ${req.title}`,
    '',
    req.description.slice(0, 200),
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for copy tailored to your brief.)',
  ].join('\n'));
}

// ─── Business Plan & Pitch Deck Agent ──────────────────────────────────────

const BUSINESS_PLAN_PROMPT = `
You are GigHuz's Business Plan & Pitch Agent. Given a brief describing a
business idea, produce a lean business-plan outline as plain text:
"PROBLEM", "SOLUTION", "TARGET MARKET", "BUSINESS MODEL" (how it makes
money), "GO-TO-MARKET" (2-3 concrete first steps), and "KEY RISKS" (2-3,
honestly assessed). Be specific to the brief, not generic startup advice.
`;

export async function runBusinessPlanAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(BUSINESS_PLAN_PROMPT, req, () => [
    `BUSINESS PLAN OUTLINE — ${req.title}`,
    '',
    'PROBLEM',
    req.description.slice(0, 200),
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for a plan tailored to your idea.)',
  ].join('\n'));
}

// ─── Video Script Writer Agent ─────────────────────────────────────────────

const VIDEO_SCRIPT_PROMPT = `
You are GigHuz's Video Script Writer Agent. Given a brief describing a video's
goal, platform (e.g. YouTube, TikTok, ad), and audience, write a complete
script formatted as a two-column-style breakdown in plain text: for each
beat, a "[VISUAL]" line describing what's on screen and a "[VO/DIALOGUE]"
line with the spoken words. Include a strong hook in the first 3 seconds and
a clear call to action at the end. Match length/pacing to the platform if
stated (short-form = tight and fast, long-form = more room to breathe).
`;

export async function runVideoScriptAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(VIDEO_SCRIPT_PROMPT, req, () => [
    `VIDEO SCRIPT — ${req.title}`,
    '',
    '[VISUAL] Opening hook shot',
    `[VO/DIALOGUE] Hook line related to: ${req.description.slice(0, 150)}`,
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for a script tailored to your brief.)',
  ].join('\n'));
}

// ─── Podcast Show Notes Agent ───────────────────────────────────────────────

const PODCAST_NOTES_PROMPT = `
You are GigHuz's Podcast Show Notes Agent. Given a brief describing an
episode's topic or a rough outline/transcript, produce publish-ready show
notes: a 2-3 sentence episode summary, "TOPICS DISCUSSED" as timestamped-style
bullets (use approximate markers like "~5 min:" if no real timestamps are
given), "KEY QUOTES" (1-3, paraphrased if no exact transcript given), and
"LINKS & RESOURCES MENTIONED" (only if inferable from the brief).
`;

export async function runPodcastNotesAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(PODCAST_NOTES_PROMPT, req, () => [
    `SHOW NOTES — ${req.title}`,
    '',
    req.description.slice(0, 200),
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for notes tailored to your episode.)',
  ].join('\n'));
}

// ─── Logo Concept Agent ─────────────────────────────────────────────────────
// Note: produces a simple original SVG mark based on the brief, not a
// hand-illustrated logo -- a fast concept starting point, not a final asset.

const LOGO_CONCEPT_PROMPT = `
You are GigHuz's Logo Concept Agent. Given a brief describing a brand name,
industry, and any style preference, design a simple, original geometric or
typographic logo mark as clean SVG (viewBox 0 0 200 200, no external fonts —
use <text> with a generic font-family fallback like sans-serif, or pure
shapes). Respond with:
1. A one-paragraph explanation of the concept (shape/symbolism, colors used)
2. The full SVG in a single fenced code block tagged "svg"
Keep it simple and scalable — this is a concept starting point, not a final
production asset. Use 1-3 colors matching the brief's apparent tone.
`;

export async function runLogoConceptAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generateFile(LOGO_CONCEPT_PROMPT, req, () => [
    '```svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="#0F766E"/><text x="100" y="108" font-size="28" fill="#fff" text-anchor="middle" font-family="sans-serif">${req.title.slice(0, 2).toUpperCase()}</text></svg>`,
    '```',
  ].join('\n'), {
    slug: 'logo-concept',
    extension: 'svg',
    mimeType: 'image/svg+xml',
    lang: 'svg',
    introText: () => `Logo concept for "${req.title}" ready to download — an original starting concept, not a final production asset.`,
  });
}

// ─── UX Microcopy Agent ─────────────────────────────────────────────────────

const UX_MICROCOPY_PROMPT = `
You are GigHuz's UX Microcopy Agent. Given a brief describing a product flow
or screen (e.g. onboarding, empty states, error messages, button labels),
write the actual interface copy: group it by screen/state, and for each give
the copy plus a one-line rationale for tone/word choice. Keep copy tight —
buttons and labels a few words, error/empty states one short sentence plus a
next-step action where relevant.
`;

export async function runUxMicrocopyAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(UX_MICROCOPY_PROMPT, req, () => [
    `UX MICROCOPY — ${req.title}`,
    '',
    req.description.slice(0, 200),
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for copy tailored to your flow.)',
  ].join('\n'));
}

// ─── Cover Letter Writer Agent ──────────────────────────────────────────────

const COVER_LETTER_PROMPT = `
You are GigHuz's Cover Letter Writer Agent. Given a brief describing someone's
background and the role/company they're applying to, write a genuine,
specific cover letter (not generic filler) — 3-4 short paragraphs: an opening
that names the role and a hook, 1-2 paragraphs connecting real experience
from the brief to the role's needs, and a confident closing. Under 350 words.
Don't invent employers, achievements, or credentials not in the brief.
`;

export async function runCoverLetterAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(COVER_LETTER_PROMPT, req, () => [
    `COVER LETTER — ${req.title}`,
    '',
    req.description.slice(0, 200),
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for a letter tailored to your background.)',
  ].join('\n'));
}

// ─── LinkedIn Profile Optimizer Agent ───────────────────────────────────────

const LINKEDIN_OPTIMIZER_PROMPT = `
You are GigHuz's LinkedIn Profile Optimizer Agent. Given a brief describing
someone's background and career goals, produce: a "HEADLINE" (under 220
chars, keyword-rich, not just a job title), an "ABOUT" section (3 short
paragraphs, first-person, written to be scanned not read), and 3-5 suggested
"FEATURED SKILLS" to pin. Base everything only on what's in the brief.
`;

export async function runLinkedinOptimizerAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(LINKEDIN_OPTIMIZER_PROMPT, req, () => [
    `LINKEDIN OPTIMIZATION — ${req.title}`,
    '',
    req.description.slice(0, 200),
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for a profile tailored to your background.)',
  ].join('\n'));
}

// ─── Ad Copy Agent ───────────────────────────────────────────────────────────

const AD_COPY_PROMPT = `
You are GigHuz's Ad Copy Agent. Given a brief describing a product/offer and
platform (Google Search, Meta/Instagram, etc.), write ready-to-run ad
variants: for Google-style ads, 3 headline options (under 30 chars each) and
2 description options (under 90 chars each); for social-style ads, 3 full ad
copy variants (headline + body + CTA) suited to a feed placement. Infer the
right format from the brief; if unclear, provide both.
`;

export async function runAdCopyAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(AD_COPY_PROMPT, req, () => [
    `AD COPY — ${req.title}`,
    '',
    req.description.slice(0, 200),
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for copy tailored to your offer.)',
  ].join('\n'));
}

// ─── FAQ & Support Script Agent ─────────────────────────────────────────────

const SUPPORT_SCRIPT_PROMPT = `
You are GigHuz's FAQ & Support Script Agent. Given a brief describing a
product/service and common customer situations, produce: an "FAQ" section
(6-10 realistic question/answer pairs covering pricing, how-to, and
troubleshooting as applicable) and a "SUPPORT SCRIPT" section (2-3 scripted
responses for a live-chat or email agent to use verbatim for the most likely
tricky situations — refunds, delays, complaints). Friendly, clear, on-brand.
`;

export async function runSupportScriptAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(SUPPORT_SCRIPT_PROMPT, req, () => [
    `FAQ & SUPPORT SCRIPTS — ${req.title}`,
    '',
    req.description.slice(0, 200),
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for FAQs tailored to your product.)',
  ].join('\n'));
}

// ─── Product Description Writer Agent ───────────────────────────────────────

const PRODUCT_DESCRIPTION_PROMPT = `
You are GigHuz's Product Description Writer Agent. Given a brief describing a
product and its features, write ecommerce-ready copy: a short punchy title
line, a 2-3 sentence hook paragraph, a bulleted "FEATURES & BENEFITS" list
(feature -> the benefit it delivers, not just the spec), and 5-8 SEO keyword
tags. Write to sell, but don't invent specs, materials, or claims not implied
by the brief.
`;

export async function runProductDescriptionAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(PRODUCT_DESCRIPTION_PROMPT, req, () => [
    `PRODUCT DESCRIPTION — ${req.title}`,
    '',
    req.description.slice(0, 200),
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for copy tailored to your product.)',
  ].join('\n'));
}

// ─── SEO Keyword Research Agent ─────────────────────────────────────────────

const KEYWORD_RESEARCH_PROMPT = `
You are GigHuz's SEO Keyword Research Agent. Given a brief describing a
business, topic, or page, produce a keyword research table as CSV with
columns: keyword, search_intent (informational/commercial/transactional/
navigational), est_difficulty (low/medium/high), suggested_use (e.g. "blog
post title", "product page H1", "meta description"). Include 15-25 realistic,
specific keywords/phrases relevant to the brief — not generic single words.
Respond with a one-line summary, then the CSV inside a single fenced code
block tagged "csv".
`;

export async function runKeywordResearchAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generateFile(KEYWORD_RESEARCH_PROMPT, req, () => [
    '```csv',
    'keyword,search_intent,est_difficulty,suggested_use',
    `${req.title.toLowerCase()},informational,medium,blog post title`,
    '```',
  ].join('\n'), {
    slug: 'keyword-research',
    extension: 'csv',
    mimeType: 'text/csv',
    lang: 'csv',
    introText: (csv) => `Keyword research for "${req.title}" ready to download.\n\nPreview:\n${csv.split('\n').slice(0, 5).join('\n')}`,
  });
}

// ─── Proofreader & Copyeditor Agent ─────────────────────────────────────────

const PROOFREADER_PROMPT = `
You are GigHuz's Proofreader & Copyeditor Agent. The task brief contains (or
describes) a piece of writing that needs proofreading. Fix grammar,
spelling, punctuation, and awkward phrasing while preserving the author's
voice and meaning — don't rewrite the whole thing. Respond with:
1. A short summary of the kinds of issues found (e.g. "12 comma splices, 3 spelling errors, tightened 4 wordy sentences")
2. The corrected text inside a single fenced code block tagged "text"
`;

export async function runProofreaderAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generateFile(PROOFREADER_PROMPT, req, () => [
    '```text',
    req.description,
    '```',
  ].join('\n'), {
    slug: 'proofreader',
    extension: 'txt',
    mimeType: 'text/plain',
    lang: 'text',
    introText: (txt) => `Proofread copy for "${req.title}" ready to download.\n\nPreview:\n${txt.slice(0, 300)}${txt.length > 300 ? '…' : ''}`,
  });
}

// ─── Freelance Proposal & SOW Writer Agent ──────────────────────────────────

const PROPOSAL_WRITER_PROMPT = `
You are GigHuz's Proposal & Statement of Work Writer Agent. Given a brief
describing a project and the client's apparent needs, draft a client-ready
proposal document: "PROJECT OVERVIEW", "SCOPE OF WORK" (numbered
deliverables), "TIMELINE" (phases with rough durations), "PRICING" (if a
budget/rate is inferable from the brief, otherwise note "pricing TBD based on
final scope"), and "NEXT STEPS". Professional, confident, specific to the
brief — not boilerplate. Respond with the document inside a single fenced
code block tagged "text".
`;

export async function runProposalWriterAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generateFile(PROPOSAL_WRITER_PROMPT, req, () => [
    '```text',
    `PROJECT OVERVIEW\n${req.description.slice(0, 200)}\n\nSCOPE OF WORK\n${req.acceptanceCriteria.map((c) => `- ${c}`).join('\n')}`,
    '```',
  ].join('\n'), {
    slug: 'proposal-writer',
    extension: 'txt',
    mimeType: 'text/plain',
    lang: 'text',
    introText: (txt) => `Proposal document for "${req.title}" ready to download.\n\nPreview:\n${txt.slice(0, 300)}${txt.length > 300 ? '…' : ''}`,
  });
}

// ─── Survey & Questionnaire Designer Agent ──────────────────────────────────

const SURVEY_DESIGNER_PROMPT = `
You are GigHuz's Survey & Questionnaire Designer Agent. Given a brief
describing what someone wants to learn (customer satisfaction, product
feedback, market research, etc.), design a complete survey: 8-15 questions,
each labeled with its type (multiple choice, rating scale, open text), in a
logical order (easy/screening questions first, sensitive/open-ended last).
Note which questions are optional. Keep the whole survey completable in
under 5 minutes.
`;

export async function runSurveyDesignerAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(SURVEY_DESIGNER_PROMPT, req, () => [
    `SURVEY DESIGN — ${req.title}`,
    '',
    req.description.slice(0, 200),
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for a survey tailored to your goal.)',
  ].join('\n'));
}

// ─── Press Release Writer Agent ─────────────────────────────────────────────

const PRESS_RELEASE_PROMPT = `
You are GigHuz's Press Release Writer Agent. Given a brief describing an
announcement (launch, funding, partnership, milestone), write an
AP-style press release: a punchy headline, a dateline, a strong lead
paragraph (who/what/when/where/why), 2-3 body paragraphs with supporting
detail, a quote attributed to a relevant person if named in the brief (or a
placeholder "[Name, Title]" if not), and a standard boilerplate "About"
paragraph. Under 500 words.
`;

export async function runPressReleaseAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(PRESS_RELEASE_PROMPT, req, () => [
    `PRESS RELEASE — ${req.title}`,
    '',
    req.description.slice(0, 200),
    '',
    '(AI generation unavailable — this is a deterministic placeholder. Retry for a release tailored to your announcement.)',
  ].join('\n'));
}

// ─── SQL Query Writer Agent ──────────────────────────────────────────────────

const SQL_QUERY_PROMPT = `
You are GigHuz's SQL Query Writer Agent. Given a brief describing a data
question and (if given) a table/schema description, write the SQL query that
answers it. Respond with:
1. A short explanation of the query's logic and any assumptions made about the schema
2. The SQL inside a single fenced code block tagged "sql"
3. A one-line note on which SQL dialect it targets (default to standard ANSI SQL if unspecified)
`;

export async function runSqlQueryAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generate(SQL_QUERY_PROMPT, req, () => [
    `SQL QUERY — ${req.title}`,
    '',
    'AI generation is temporarily unavailable, so here is a scaffold to start from:',
    '```sql',
    `-- TODO: implement — ${req.description.slice(0, 150)}`,
    '```',
    'Retry the task once the AI service is available for a full query.',
  ].join('\n'));
}

// ─── API Documentation Writer Agent ─────────────────────────────────────────

const API_DOCS_PROMPT = `
You are GigHuz's API Documentation Writer Agent. Given a brief describing an
API endpoint or a set of endpoints (method, path, params, behavior), write
clean Markdown documentation: for each endpoint, a heading with method+path,
a one-line description, a "Parameters" table (name, type, required, notes),
an example request, and an example JSON response. If the brief is sparse,
make reasonable, clearly-labeled assumptions rather than leaving sections
blank. Respond with the full docs inside a single fenced code block tagged
"markdown".
`;

export async function runApiDocsAgent(req: AgentInvocationRequest): Promise<AgentRunResult> {
  return generateFile(API_DOCS_PROMPT, req, () => [
    '```markdown',
    `# ${req.title}\n\n${req.description.slice(0, 200)}`,
    '```',
  ].join('\n'), {
    slug: 'api-docs',
    extension: 'md',
    mimeType: 'text/markdown',
    lang: 'markdown',
    introText: (md) => `API documentation for "${req.title}" ready to download.\n\nPreview:\n${md.slice(0, 300)}${md.length > 300 ? '…' : ''}`,
  });
}
