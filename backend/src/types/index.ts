// ─── GigHuz Core Domain Types ────────────────────────────────────────────────

export type UserRole = 'recruiter' | 'freelancer' | 'admin';

export interface Recruiter {
  id: string;
  uid: string;
  role: 'recruiter';
  name: string;
  company?: string;
  country: string;
  profilePictureUrl?: string;
  stripeCustomerId?: string;
  verified: boolean;
  totalSpent: number;
  jobsPosted: number;
  createdAt: string;
}

export type ResumeSource = 'uploaded' | 'ai_generated';

export interface Freelancer {
  id: string;
  uid: string;
  role: 'freelancer';
  name: string;
  country: string;
  whatsappNumber?: string;
  skills: string[];
  expertiseClusterScore: number;        // 0–100, computed by Matching Agent
  portfolioLinks: string[];
  bio: string;
  hourlyRate?: number;
  currency: string;
  availability: 'open' | 'busy' | 'unavailable';
  verified: boolean;
  totalEarnings: number;                // cents (USD)
  completedJobs: number;
  averageRating: number;                // 0–5
  createdAt: string;
  profilePictureUrl?: string;
  resumeUrl?: string;                   // uploaded resume file (PDF/DOC)
  resumeText?: string;                  // AI-generated resume content
  resumeSource?: ResumeSource;
  resumeUpdatedAt?: string;
  skillVerification?: SkillVerificationResult;
  // Payout routing details
  paystackRecipientCode?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
}

export type JobStatus =
  | 'pending_structure'   // just posted, Structuring Agent not yet run
  | 'structured'          // milestones defined, awaiting matching
  | 'matched'             // top candidates notified
  | 'in_progress'         // freelancer assigned
  | 'under_review'        // submission received, Auditor running
  | 'completed'           // all milestones approved and paid
  | 'cancelled';

export interface MilestoneTemplate {
  id: string;
  name: string;
  deliverableDescription: string;
  acceptanceCriteria: string[];
  paymentAmountUsd: number;
  durationDays: number;
}

export interface Job {
  id: string;
  recruiterId: string;
  title: string;
  descriptionRaw: string;
  structuredMilestones: MilestoneTemplate[];
  skillsRequired: string[];
  budgetMinUsd: number;
  budgetMaxUsd: number;
  timelineDays: number;
  status: JobStatus;
  source: 'direct' | 'scraped';
  sourceUrl?: string;
  assignedFreelancerId?: string;
  matchedCandidateIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type MilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'auditing'
  | 'approved'
  | 'paid'
  | 'flagged';

export interface MilestoneInstance {
  id: string;
  jobId: string;
  milestoneTemplateId: string;
  freelancerId: string;
  recruiterId: string;
  name: string;
  deliverableDescription: string;
  acceptanceCriteria: string[];
  paymentAmountUsd: number;
  status: MilestoneStatus;
  stripePaymentIntentId?: string;
  stripeEscrowAmount?: number;          // cents
  paystackTransferCode?: string;
  flutterwaveTransferId?: string;
  dueDate: string;
  submittedAt?: string;
  approvedAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChangeRequestVerdict = 'in_scope' | 'out_of_scope' | 'pending';

export interface ChangeRequest {
  id: string;
  milestoneId: string;
  jobId: string;
  recruiterId: string;
  freelancerId: string;
  description: string;
  verdict: ChangeRequestVerdict;
  reasoning?: string;
  suggestedAdditionalAmountUsd?: number;
  createdAt: string;
}

export interface CaseStudy {
  id: string;
  freelancerId: string;
  jobId: string;
  milestoneId: string;
  jobTitle: string;
  summary: string;
  skillsUsed: string[];
  outcomeHighlight: string;
  createdAt: string;
}

export interface SkillVerificationResult {
  score: number;                          // 0–100 confidence that portfolio evidence backs claimed skills
  notes: string;
  verifiedLinks: Array<{ url: string; supportsSkills: string[]; unreachable?: boolean }>;
  verifiedAt: string;
}

export type AuditResult = 'pending' | 'pass' | 'flag';

export interface SubmissionFile {
  name: string;
  url: string;
  type: string;
  sizeBytes: number;
}

export interface Submission {
  id: string;
  milestoneId: string;
  jobId: string;
  freelancerId: string;
  files: SubmissionFile[];
  notes: string;
  deliverableType: 'code' | 'writing' | 'design' | 'data' | 'other';
  auditResult: AuditResult;
  auditFeedback?: string;
  auditChecks?: Array<{ name: string; passed: boolean; detail: string }>;
  submittedAt: string;
}

// ─── Agent I/O Types ──────────────────────────────────────────────────────────

export interface StructuringAgentInput {
  jobId: string;
  recruiterId: string;
  descriptionRaw: string;
}

export interface StructuringAgentOutput {
  jobId: string;
  title: string;
  structuredMilestones: MilestoneTemplate[];
  skillsRequired: string[];
  budgetMinUsd: number;
  budgetMaxUsd: number;
  timelineDays: number;
  summary: string;
}

export interface MatchingAgentInput {
  job: Job;
}

export interface MatchingAgentOutput {
  jobId: string;
  matches: Array<{
    freelancerId: string;
    score: number;         // 0–100
    reasoning: string;
  }>;
}

export interface AuditorInput {
  submission: Submission;
  milestone: MilestoneInstance;
}

export interface AuditorOutput {
  submissionId: string;
  result: AuditResult;
  feedback: string;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
}

export type CommsEventType =
  | 'job_matched'
  | 'submission_audited'
  | 'payment_sent'
  | 'deadline_reminder'
  | 'dispute';

export interface CommsAgentInput {
  type: CommsEventType;
  recipientId: string;
  recipientRole: 'recruiter' | 'freelancer';
  whatsappNumber?: string;
  email?: string;
  context: Record<string, string | number>;
}

export interface CommsAgentOutput {
  message: string;
  channel: 'whatsapp' | 'email';
  sent: boolean;
}

export interface ScopeGuardAgentInput {
  milestone: MilestoneInstance;
  requestDescription: string;
}

export interface ScopeGuardAgentOutput {
  verdict: 'in_scope' | 'out_of_scope';
  reasoning: string;
  suggestedAdditionalAmountUsd?: number;
}

export interface SkillVerificationAgentInput {
  skills: string[];
  portfolioLinks: string[];
}

export interface CaseStudyAgentInput {
  jobTitle: string;
  milestoneName: string;
  deliverableDescription: string;
  acceptanceCriteria: string[];
  submissionNotes: string;
  skillsUsed: string[];
  auditFeedback: string;
}

export interface CaseStudyAgentOutput {
  summary: string;
  outcomeHighlight: string;
}

// ─── Payment Types ────────────────────────────────────────────────────────────

export interface EscrowFundResult {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;         // cents
  currency: string;
}

export interface PayoutResult {
  success: boolean;
  reference: string;
  provider: 'paystack' | 'flutterwave';
  amountUsd: number;
}
