import { GoogleGenerativeAI } from '@google/generative-ai';
import { SkillVerificationAgentInput, SkillVerificationResult } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const FETCH_TIMEOUT_MS = 8000;
const MAX_CHARS_PER_LINK = 4000;

async function fetchLinkText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'GigHuzSkillVerificationBot/1.0' } });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.slice(0, MAX_CHARS_PER_LINK) || null;
  } catch {
    return null;
  }
}

const PROMPT = (skills: string[], evidence: Array<{ url: string; text: string | null }>) => `
You are GigHuz's Skill Verification Agent. A freelancer claims the skills
listed below and has provided portfolio links as evidence. You've been given
the extracted page text for each link (or null if it couldn't be reached).
Judge, skeptically but fairly, how well the evidence actually supports the
claimed skills — don't take the freelancer's word for it, look for concrete
signals (project descriptions, code, technologies named, case studies).

CLAIMED SKILLS: ${skills.join(', ')}

EVIDENCE:
${evidence.map((e, i) => `[${i}] ${e.url}\n${e.text ? e.text.slice(0, 1500) : '(page could not be reached)'}`).join('\n\n')}

Return ONLY valid JSON:
{
  "score": <0-100, overall confidence the evidence backs the claimed skills>,
  "notes": "<2-3 sentences, specific about what is and isn't supported>",
  "verifiedLinks": [
    { "url": "<url>", "supportsSkills": ["<skill>", "..."], "unreachable": <true if page text was null> }
  ]
}

Rules:
- A link with unreachable text can't verify anything — list it with an empty supportsSkills array and unreachable: true.
- Don't inflate the score to be nice. If the evidence is thin, say so.
`;

export async function runSkillVerificationAgent(input: SkillVerificationAgentInput): Promise<SkillVerificationResult> {
  const now = new Date().toISOString();

  if (input.portfolioLinks.length === 0) {
    return {
      score: 0,
      notes: 'No portfolio links to verify against — add some to build a verification score.',
      verifiedLinks: [],
      verifiedAt: now,
    };
  }

  const evidence = await Promise.all(
    input.portfolioLinks.map(async (url) => ({ url, text: await fetchLinkText(url) }))
  );

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  try {
    const result = await model.generateContent(PROMPT(input.skills, evidence));
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);

    return {
      score: Math.max(0, Math.min(100, parsed.score)),
      notes: parsed.notes,
      verifiedLinks: parsed.verifiedLinks,
      verifiedAt: now,
    };
  } catch {
    const reachable = evidence.filter((e) => e.text).length;
    return {
      score: reachable > 0 ? 30 : 0,
      notes: 'Automated verification could not complete. Score reflects link reachability only, not actual skill evidence — try again later.',
      verifiedLinks: evidence.map((e) => ({ url: e.url, supportsSkills: [], unreachable: !e.text })),
      verifiedAt: now,
    };
  }
}
