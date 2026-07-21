import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub({ projectId: process.env.GOOGLE_CLOUD_PROJECT });

type GigHuzEvent =
  | 'job.posted'
  | 'job.structured'
  | 'submission.received'
  | 'milestone.approved';

const TOPICS: Record<GigHuzEvent, string> = {
  'job.posted':           process.env.PUBSUB_TOPIC_JOB_POSTED     || 'job-posted',
  'job.structured':       process.env.PUBSUB_TOPIC_JOB_STRUCTURED  || 'job-structured',
  'submission.received':  process.env.PUBSUB_TOPIC_SUBMISSION_RECEIVED || 'submission-received',
  'milestone.approved':   process.env.PUBSUB_TOPIC_MILESTONE_APPROVED  || 'milestone-approved',
};

export async function publishEvent(
  event: GigHuzEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const topic = pubsub.topic(TOPICS[event]);
  const data  = Buffer.from(JSON.stringify({ event, ...payload, timestamp: new Date().toISOString() }));

  try {
    await topic.publishMessage({ data });
    console.log(`[PubSub] Published: ${event}`, payload);
  } catch (err) {
    // In development, log and continue — don't crash on missing topics
    console.warn(`[PubSub] Could not publish ${event}:`, err);
  }
}
