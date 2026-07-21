// One-off local seed script — creates demo accounts + sample data directly
// against the Firebase Auth/Firestore emulators. Not part of the TS build.
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8081';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

initializeApp({ projectId: 'demo-gighuz' });
const auth = getAuth();
const db = getFirestore();

async function upsertUser(email, password) {
  try {
    const existing = await auth.getUserByEmail(email);
    return existing.uid;
  } catch {
    const user = await auth.createUser({ email, password, emailVerified: true });
    return user.uid;
  }
}

async function main() {
  const now = new Date().toISOString();

  const recruiterUid = await upsertUser('demo.recruiter@gighuz.test', 'Demo1234!');
  const freelancerUid = await upsertUser('demo.freelancer@gighuz.test', 'Demo1234!');

  const recruiterId = 'demo-recruiter-1';
  await db.collection('recruiters').doc(recruiterId).set({
    id: recruiterId,
    uid: recruiterUid,
    role: 'recruiter',
    name: 'Dami Adeyemi',
    company: 'Northwind Digital',
    country: 'US',
    verified: true,
    totalSpent: 0,
    jobsPosted: 1,
    createdAt: now,
  }, { merge: true });

  const freelancerId = 'demo-freelancer-1';
  await db.collection('freelancers').doc(freelancerId).set({
    id: freelancerId,
    uid: freelancerUid,
    role: 'freelancer',
    name: 'Amara Osei',
    country: 'GH',
    bio: 'Full-stack developer with 4+ years building React and Node.js applications and REST APIs for global clients.',
    skills: ['React', 'TypeScript', 'Node.js', 'Tailwind CSS'],
    portfolioLinks: ['https://github.com/amara-dev'],
    expertiseClusterScore: 82,
    availability: 'open',
    verified: true,
    totalEarnings: 0,
    completedJobs: 3,
    averageRating: 4.8,
    currency: 'USD',
    hourlyRate: 35,
    whatsappNumber: '+233201234567',
    createdAt: now,
  }, { merge: true });

  // A sample structured + matched job so the dashboards aren't empty
  const jobId = 'demo-job-1';
  const milestoneTemplateId = uuidv4();
  await db.collection('jobs').doc(jobId).set({
    id: jobId,
    recruiterId,
    title: 'Build a React dashboard with REST API integration',
    descriptionRaw: 'We need a responsive admin dashboard built in React with Tailwind CSS, connecting to our existing REST API. Should include auth, data tables, and charts.',
    structuredMilestones: [
      {
        id: milestoneTemplateId,
        name: 'Dashboard UI + API integration',
        deliverableDescription: 'Responsive dashboard with live data from the REST API',
        acceptanceCriteria: ['All endpoints connected', 'Responsive on mobile', 'Error states handled'],
        paymentAmountUsd: 450,
        durationDays: 10,
      },
    ],
    skillsRequired: ['React', 'TypeScript', 'Tailwind CSS'],
    budgetMinUsd: 400,
    budgetMaxUsd: 600,
    timelineDays: 10,
    status: 'matched',
    source: 'direct',
    matchedCandidateIds: [freelancerId],
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  console.log('\nSeeded demo accounts:');
  console.log('  Recruiter   demo.recruiter@gighuz.test  / Demo1234!');
  console.log('  Freelancer  demo.freelancer@gighuz.test / Demo1234!');
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
