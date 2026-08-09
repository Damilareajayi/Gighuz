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
  status: string;
  source: 'direct' | 'scraped';
  assignedFreelancerId?: string;
  matchedCandidateIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type ResumeSource = 'uploaded' | 'ai_generated';

export interface SkillVerificationResult {
  score: number;
  notes: string;
  verifiedLinks: Array<{ url: string; supportsSkills: string[]; unreachable?: boolean }>;
  verifiedAt: string;
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

export interface Freelancer {
  id: string;
  uid: string;
  role: 'freelancer';
  name: string;
  country: string;
  whatsappNumber?: string;
  skills: string[];
  expertiseClusterScore: number;
  portfolioLinks: string[];
  bio: string;
  hourlyRate?: number;
  currency: string;
  availability: 'open' | 'busy' | 'unavailable';
  verified: boolean;
  totalEarnings: number;
  completedJobs: number;
  averageRating: number;
  createdAt: string;
  profilePictureUrl?: string;
  resumeUrl?: string;
  resumeText?: string;
  resumeSource?: ResumeSource;
  resumeUpdatedAt?: string;
  skillVerification?: SkillVerificationResult;
}

export interface Recruiter {
  id: string;
  uid: string;
  role: 'recruiter';
  name: string;
  company?: string;
  country: string;
  profilePictureUrl?: string;
  verified: boolean;
  totalSpent: number;
  jobsPosted: number;
  createdAt: string;
}

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
  status: string;
  stripePaymentIntentId?: string;
  paystackTransferCode?: string;
  flutterwaveTransferId?: string;
  dueDate: string;
  submittedAt?: string;
  approvedAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeRequest {
  id: string;
  milestoneId: string;
  jobId: string;
  recruiterId: string;
  freelancerId: string;
  description: string;
  verdict: 'in_scope' | 'out_of_scope' | 'pending';
  reasoning?: string;
  suggestedAdditionalAmountUsd?: number;
  createdAt: string;
}

export interface Submission {
  id: string;
  milestoneId: string;
  jobId: string;
  freelancerId: string;
  files: { name: string; url: string; type: string; sizeBytes: number }[];
  notes: string;
  deliverableType: 'code' | 'writing' | 'design' | 'data' | 'other';
  auditResult: 'pending' | 'pass' | 'flag';
  auditFeedback?: string;
  auditChecks?: { name: string; passed: boolean; detail: string }[];
  submittedAt: string;
}
