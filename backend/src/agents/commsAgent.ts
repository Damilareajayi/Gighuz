import { GoogleGenerativeAI } from '@google/generative-ai';
import { sendWhatsApp } from '../services/whatsapp';
import { CommsAgentInput, CommsAgentOutput, CommsEventType } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MESSAGE_PROMPTS: Record<CommsEventType, (ctx: Record<string, string | number>) => string> = {
  job_matched: (c) => `
Write a short WhatsApp message to a freelancer telling them they've been matched to a new job opportunity on GigHuz.
Job: "${c.jobTitle}", Budget: $${c.budgetMinUsd}–$${c.budgetMaxUsd} USD, Timeline: ${c.timelineDays} days.
Keep it under 100 words. Friendly, professional. End with a clear call to action to view the job on the platform.
Include the platform link placeholder: [VIEW JOB]
`,
  submission_audited: (c) => `
Write a short WhatsApp message to a freelancer about their submission audit result.
Result: ${c.result === 'pass' ? 'PASSED ✓' : 'NEEDS REVISION ✗'}
Milestone: "${c.milestoneName}"
Feedback: ${c.feedback}
Keep it under 120 words. Specific and actionable. If passed, tell them payment is being released.
`,
  payment_sent: (c) => `
Write a short WhatsApp message to a freelancer confirming payment has been sent.
Amount: ${c.amount}
Reference: ${c.reference}
Milestone: "${c.milestoneName}"
Keep it under 80 words. Celebratory but professional.
`,
  deadline_reminder: (c) => `
Write a short friendly WhatsApp reminder to a freelancer about an upcoming milestone deadline.
Milestone: "${c.milestoneName}"
Due in: ${c.daysRemaining} days
Keep it under 60 words. Supportive, not threatening.
`,
  dispute: (c) => `
Write a professional WhatsApp message to a ${c.recipientRole} about a flagged dispute on GigHuz.
Job: "${c.jobTitle}"
Issue: ${c.issueDescription}
Keep it under 100 words. Neutral, factual. Tell them a human reviewer will respond within 24 hours.
`,
};

export async function runCommsAgent(input: CommsAgentInput): Promise<CommsAgentOutput> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const promptFn = MESSAGE_PROMPTS[input.type];

  let message = '';
  try {
    const result = await model.generateContent(promptFn(input.context));
    message = result.response.text().trim();
  } catch {
    message = getDefaultMessage(input.type);
  }

  console.log(`[CommsAgent] ${input.type} → ${input.recipientRole} ${input.recipientId}`);
  console.log(`[CommsAgent] Message: ${message}`);

  let sent = false;
  if (input.whatsappNumber) {
    await sendWhatsApp(input.whatsappNumber, message);
    sent = true;
  }

  return {
    message,
    channel: input.whatsappNumber ? 'whatsapp' : 'email',
    sent,
  };
}

function getDefaultMessage(type: CommsEventType): string {
  const defaults: Record<CommsEventType, string> = {
    job_matched:        'You have a new job match on GigHuz. Log in to view it.',
    submission_audited: 'Your submission has been reviewed. Log in for details.',
    payment_sent:        'Your payment has been processed. Check your account.',
    deadline_reminder:  'Your milestone deadline is approaching. Log in to submit.',
    dispute:            'A dispute has been flagged on your account. We will review it within 24 hours.',
  };
  return defaults[type];
}
