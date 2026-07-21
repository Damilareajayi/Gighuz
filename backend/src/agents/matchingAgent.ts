import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../services/firebase';
import { runCommsAgent } from './commsAgent';
import { MatchingAgentInput, MatchingAgentOutput, Freelancer } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PROMPT = (job: MatchingAgentInput['job'], freelancers: Freelancer[]) => `
You are GigHuz's Matching Agent. Rank the following freelancers for the job below.

JOB:
Title: ${job.title}
Skills Required: ${job.skillsRequired.join(', ')}
Budget: $${job.budgetMinUsd}–$${job.budgetMaxUsd} USD
Timeline: ${job.timelineDays} days
Milestones: ${job.structuredMilestones.map(m => m.name).join(', ')}

FREELANCERS:
${freelancers.map((f, i) => `
[${i}] ID: ${f.id}
  Name: ${f.name}
  Skills: ${f.skills.join(', ')}
  Rating: ${f.averageRating}/5
  Completed Jobs: ${f.completedJobs}
  Availability: ${f.availability}
  Country: ${f.country}
`).join('')}

Return ONLY valid JSON — top 3 matches ranked by fit:
{
  "matches": [
    {
      "freelancerId": "<id>",
      "score": <0-100>,
      "reasoning": "<one sentence why this person fits>"
    }
  ]
}

Rules:
- Only include freelancers with availability: "open"
- Prioritize skill match, then rating, then completed jobs
- Never recommend someone whose skills don't overlap with job requirements
`;

export async function runMatchingAgent(
  input: MatchingAgentInput
): Promise<MatchingAgentOutput> {
  const { job } = input;
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const freelancersSnap = await db()
    .collection('freelancers')
    .where('availability', '==', 'open')
    .get();
  const available = freelancersSnap.docs.map(d => d.data() as Freelancer);

  let matches: MatchingAgentOutput['matches'] = [];

  if (available.length > 0) {
    try {
      const result = await model.generateContent(PROMPT(job, available));
      const text = result.response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text);
      matches = parsed.matches.slice(0, 3);
    } catch {
      matches = available
        .sort((a, b) => b.averageRating - a.averageRating)
        .slice(0, 3)
        .map(f => ({
          freelancerId: f.id,
          score: Math.round(f.averageRating * 20),
          reasoning: 'Auto-matched by rating (semantic match unavailable)',
        }));
    }
  }

  await db().collection('jobs').doc(job.id).update({
    matchedCandidateIds: matches.map(m => m.freelancerId),
    status: 'matched',
    updatedAt: new Date().toISOString(),
  });

  for (const match of matches) {
    const freelancer = available.find(f => f.id === match.freelancerId);
    if (!freelancer) continue;

    await runCommsAgent({
      type: 'job_matched',
      recipientId: freelancer.id,
      recipientRole: 'freelancer',
      whatsappNumber: freelancer.whatsappNumber,
      context: {
        jobTitle: job.title,
        budgetMinUsd: job.budgetMinUsd,
        budgetMaxUsd: job.budgetMaxUsd,
        timelineDays: job.timelineDays,
        matchScore: match.score,
      },
    });
  }

  return { jobId: job.id, matches };
}
