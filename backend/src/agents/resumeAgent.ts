import { GoogleGenerativeAI } from '@google/generative-ai';
import { Freelancer } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PROMPT = (f: Freelancer) => `
You are GigHuz's Resume Agent. Write a concise, professional resume summary
for a freelancer profile, based only on the structured data below. Do not
invent experience, employers, or facts that aren't present — you may only
improve phrasing and structure of what's given.

Name: ${f.name}
Country: ${f.country}
Bio: ${f.bio}
Skills: ${f.skills.join(', ') || 'None listed'}
Completed Jobs: ${f.completedJobs}
Average Rating: ${f.averageRating}/5
Hourly Rate: ${f.hourlyRate ? `$${f.hourlyRate}/hr ${f.currency}` : 'Not specified'}
Portfolio Links: ${f.portfolioLinks.join(', ') || 'None'}

Structure the output as plain text (no markdown symbols) with these sections:
1. A 2-3 sentence professional summary
2. "CORE SKILLS" — the skills as a short bullet list ("- " prefix)
3. "TRACK RECORD" — only include if completedJobs > 0
4. "PORTFOLIO" — only include if portfolio links exist

Keep the whole thing under 250 words.
`;

function fallbackResume(f: Freelancer): string {
  const lines = [
    `${f.name} — ${f.country}`,
    '',
    f.bio,
    '',
    'CORE SKILLS',
    f.skills.map(s => `- ${s}`).join('\n') || '- Not specified yet',
  ];
  if (f.completedJobs > 0) {
    lines.push('', 'TRACK RECORD', `- ${f.completedJobs} completed job(s) on GigHuz, rated ${f.averageRating}/5`);
  }
  if (f.portfolioLinks.length > 0) {
    lines.push('', 'PORTFOLIO', f.portfolioLinks.map(l => `- ${l}`).join('\n'));
  }
  return lines.join('\n');
}

export async function runResumeAgent(freelancer: Freelancer): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  try {
    const result = await model.generateContent(PROMPT(freelancer));
    const text = result.response.text().trim();
    if (!text) throw new Error('empty response');
    return text;
  } catch {
    return fallbackResume(freelancer);
  }
}
