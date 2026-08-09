import { db } from './firebase';
import { Freelancer, AgentDeveloper, WorkerType } from '../types';

export interface PayoutTarget {
  id: string;
  collection: 'freelancers' | 'agentDevelopers';
  country: string;
  paystackRecipientCode?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName: string;
  currency?: string;
  whatsappNumber?: string;
  commsRole: 'freelancer' | 'agent_developer';
}

/**
 * Resolves whoever should get paid for a milestone/submission — a human
 * freelancer or an AI agent's developer — into one shape the rest of the
 * payment pipeline doesn't need to know the difference for.
 */
export async function resolvePayoutTarget(worker: {
  workerType: WorkerType;
  freelancerId?: string;
  developerId?: string;
}): Promise<PayoutTarget | undefined> {
  if (worker.workerType === 'agent') {
    if (!worker.developerId) return undefined;
    const doc = await db().collection('agentDevelopers').doc(worker.developerId).get();
    const dev = doc.data() as AgentDeveloper | undefined;
    if (!dev) return undefined;
    return {
      id: dev.id,
      collection: 'agentDevelopers',
      country: dev.country,
      paystackRecipientCode: dev.paystackRecipientCode,
      bankCode: dev.bankCode,
      accountNumber: dev.accountNumber,
      accountName: dev.accountName || dev.name,
      currency: dev.currency,
      whatsappNumber: dev.whatsappNumber,
      commsRole: 'agent_developer',
    };
  }

  if (!worker.freelancerId) return undefined;
  const doc = await db().collection('freelancers').doc(worker.freelancerId).get();
  const freelancer = doc.data() as Freelancer | undefined;
  if (!freelancer) return undefined;
  return {
    id: freelancer.id,
    collection: 'freelancers',
    country: freelancer.country,
    paystackRecipientCode: freelancer.paystackRecipientCode,
    bankCode: freelancer.bankCode,
    accountNumber: freelancer.accountNumber,
    accountName: freelancer.name,
    currency: freelancer.currency,
    whatsappNumber: freelancer.whatsappNumber,
    commsRole: 'freelancer',
  };
}
