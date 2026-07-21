import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/firebase';
import { StructuringAgentInput, StructuringAgentOutput, MilestoneTemplate } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PROMPT = (input: StructuringAgentInput) => `
You are GigHuz's Structuring Agent. Your job is to parse a raw job description
posted by an international client and convert it into a structured set of
deliverable milestones that an African freelancer can execute clearly.

Raw Description:
${input.descriptionRaw}

Extract and return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "title": "<concise job title, max 100 chars>",
  "milestones": [
    {
      "name": "<short milestone name>",
      "deliverableDescription": "<exactly what must be delivered>",
      "acceptanceCriteria": ["<criterion 1>", "<criterion 2>"],
      "paymentAmountUsd": <number>,
      "durationDays": <number>
    }
  ],
  "skillsRequired": ["<skill1>", "<skill2>"],
  "budgetMinUsd": <number>,
  "budgetMaxUsd": <number>,
  "timelineDays": <number>,
  "summary": "<2-sentence plain English summary of the job>"
}

Rules:
- Split work into 2–5 concrete milestones with clear acceptance criteria
- paymentAmountUsd should be a reasonable split of the total budget
- Skills must be specific (e.g. "React 18" not "frontend")
- If no budget is mentioned, estimate from market rates
- durationDays/timelineDays: realistic for the scope
`;

export async function runStructuringAgent(
  input: StructuringAgentInput
): Promise<StructuringAgentOutput> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  let output: StructuringAgentOutput;
  try {
    const result = await model.generateContent(PROMPT(input));
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);

    const structuredMilestones: MilestoneTemplate[] = parsed.milestones.map(
      (m: Omit<MilestoneTemplate, 'id'>) => ({ id: uuidv4(), ...m })
    );

    output = {
      jobId: input.jobId,
      title: parsed.title,
      structuredMilestones,
      skillsRequired: parsed.skillsRequired,
      budgetMinUsd: parsed.budgetMinUsd,
      budgetMaxUsd: parsed.budgetMaxUsd,
      timelineDays: parsed.timelineDays,
      summary: parsed.summary,
    };
  } catch (err) {
    // Fallback: single milestone from the raw description
    output = {
      jobId: input.jobId,
      title: input.descriptionRaw.slice(0, 80),
      structuredMilestones: [{
        id: uuidv4(),
        name: 'Project Delivery',
        deliverableDescription: input.descriptionRaw.slice(0, 300),
        acceptanceCriteria: ['Meets all requirements stated in the job description'],
        paymentAmountUsd: 100,
        durationDays: 7,
      }],
      skillsRequired: [],
      budgetMinUsd: 100,
      budgetMaxUsd: 500,
      timelineDays: 7,
      summary: 'Job requires manual review — auto-structuring failed.',
    };
  }

  await db().collection('jobs').doc(input.jobId).update({
    title: output.title,
    structuredMilestones: output.structuredMilestones,
    skillsRequired: output.skillsRequired,
    budgetMinUsd: output.budgetMinUsd,
    budgetMaxUsd: output.budgetMaxUsd,
    timelineDays: output.timelineDays,
    status: 'structured',
    updatedAt: new Date().toISOString(),
  });

  return output;
}
