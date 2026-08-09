import { GoogleGenerativeAI } from '@google/generative-ai';
import { CaseStudyAgentInput, CaseStudyAgentOutput } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PROMPT = (input: CaseStudyAgentInput) => `
You are GigHuz's Case Study Agent. A freelancer just had a milestone approved
and paid. Turn the completed work into a short, professional case-study
entry for their public profile — the kind of thing that makes a recruiter
want to hire them. Base it only on the facts given; don't invent client
names, metrics, or outcomes that aren't in the source material.

JOB: ${input.jobTitle}
MILESTONE: ${input.milestoneName}
WHAT WAS DELIVERED: ${input.deliverableDescription}
ACCEPTANCE CRITERIA MET:
${input.acceptanceCriteria.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}
FREELANCER'S SUBMISSION NOTES: ${input.submissionNotes}
AUDITOR FEEDBACK: ${input.auditFeedback}
SKILLS USED: ${input.skillsUsed.join(', ')}

Return ONLY valid JSON:
{
  "summary": "<3-4 sentence case study, written in third person, professional tone>",
  "outcomeHighlight": "<one short punchy line capturing the result, e.g. 'Delivered a production-ready dashboard audited and approved on first submission'>"
}
`;

export async function runCaseStudyAgent(input: CaseStudyAgentInput): Promise<CaseStudyAgentOutput> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  try {
    const result = await model.generateContent(PROMPT(input));
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    if (!parsed.summary) throw new Error('empty summary');
    return { summary: parsed.summary, outcomeHighlight: parsed.outcomeHighlight || 'Milestone delivered and approved.' };
  } catch {
    return {
      summary: `Completed "${input.milestoneName}" for ${input.jobTitle}, meeting all stated acceptance criteria and passing GigHuz's deliverable audit on submission.`,
      outcomeHighlight: 'Delivered and approved by GigHuz\'s AI audit.',
    };
  }
}
