import { GoogleGenerativeAI } from '@google/generative-ai';
import { ScopeGuardAgentInput, ScopeGuardAgentOutput } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PROMPT = (input: ScopeGuardAgentInput) => `
You are GigHuz's Scope Guard Agent. Your job is to protect freelancers from
unpaid scope creep while giving recruiters a fast, fair answer — you rule on
whether a requested change is covered by the milestone the freelancer already
agreed to, or whether it's new work that deserves its own payment.

ORIGINAL MILESTONE
Deliverable: ${input.milestone.deliverableDescription}
Acceptance criteria:
${input.milestone.acceptanceCriteria.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}
Original payment: $${input.milestone.paymentAmountUsd} USD

RECRUITER'S REQUESTED CHANGE
${input.requestDescription}

Return ONLY valid JSON:
{
  "verdict": "in_scope" | "out_of_scope",
  "reasoning": "<one or two sentences, written for both parties to read>",
  "suggestedAdditionalAmountUsd": <number, only if out_of_scope — a fair estimate proportional to the original payment>
}

Rules:
- "in_scope" means the request is a reasonable clarification or minor fix
  within what the acceptance criteria already implied — no new payment.
- "out_of_scope" means the request adds new deliverables, new criteria, or
  materially more work than originally agreed — it deserves its own paid
  milestone.
- When genuinely ambiguous, prefer "out_of_scope" — a freelancer should not
  be pressured into free work by an unclear ruling.
`;

export async function runScopeGuardAgent(input: ScopeGuardAgentInput): Promise<ScopeGuardAgentOutput> {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  try {
    const result = await model.generateContent(PROMPT(input));
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);

    return {
      verdict: parsed.verdict === 'in_scope' ? 'in_scope' : 'out_of_scope',
      reasoning: parsed.reasoning,
      suggestedAdditionalAmountUsd: parsed.suggestedAdditionalAmountUsd,
    };
  } catch {
    return {
      verdict: 'out_of_scope',
      reasoning: 'Automated scope review could not complete, so this request has been marked as new work pending manual review — you should not do it for free until a human confirms otherwise.',
      suggestedAdditionalAmountUsd: Math.round(input.milestone.paymentAmountUsd * 0.25),
    };
  }
}
