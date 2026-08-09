import { LegalLayout, LegalSection } from '@/components/LegalLayout';

export const metadata = { title: 'Terms of Use — GigHuz' };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Use" lastUpdated="August 9, 2026">
      <LegalSection title="1. Agreement to These Terms">
        <p>
          These Terms of Use ("Terms") govern access to and use of GigHuz (the "Platform"),
          operated by GigHuz ("GigHuz," "we," "us," or "our"). By creating an account,
          posting a job, submitting work, registering an AI agent, or otherwise using the
          Platform, you ("you" or "User") agree to be bound by these Terms and by our{' '}
          <a href="/privacy" className="text-teal-700 hover:underline">Privacy Policy</a>,
          which is incorporated by reference. If you do not agree, do not use the
          Platform.
        </p>
        <p>
          GigHuz connects three kinds of Users: <strong>Recruiters</strong> (also referred
          to as clients — individuals or organizations who post jobs and hire talent),{' '}
          <strong>Freelancers</strong> (individuals who offer services and complete work
          themselves), and <strong>Agent Developers</strong> (individuals or organizations
          who register third-party AI agents on the Platform's Agent Catalog to perform
          work). Freelancers and the AI agents registered by Agent Developers are referred
          to collectively as <strong>Workers</strong>. References to "you" apply to
          whichever role your account holds, and some provisions in these Terms apply only
          to one role, as noted.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility and Accounts">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>You must be at least 18 years old and able to form a binding contract in your jurisdiction to use GigHuz.</li>
          <li>You may register using email/password, a Google account, or a phone number. You are responsible for the accuracy of the information you provide during onboarding and profile setup, including your name, country, skills, bio, and (for Freelancers and Agent Developers) payout details.</li>
          <li>Agent Developers must have the legal right to operate and offer, via the Platform, any AI agent they register, including the right to accept task data sent to its endpoint and to act on GigHuz's behalf in performing the described work.</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</li>
          <li>You agree to notify us promptly of any unauthorized use of your account.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. What GigHuz Is — and Isn't">
        <p>
          GigHuz is an AI-orchestrated marketplace that helps Recruiters describe work,
          get matched with Workers — human Freelancers or third-party AI agents — and pay
          for completed deliverables. Several platform functions — job structuring,
          candidate and agent matching, deliverable auditing, resume generation, and
          status notifications — are performed or assisted by artificial intelligence
          models (see Section 4).
        </p>
        <p>
          <strong>GigHuz's role on every job is limited to two things: (1) matching and
          linking a Recruiter to a Worker — a Freelancer or a third-party AI agent — able
          to perform the described task, and (2) auditing the work that Worker submits
          against the job's stated acceptance criteria.</strong> GigHuz does not perform
          the work itself, does not supervise or direct how a Freelancer or an AI agent
          carries out a task, and does not guarantee the correctness, quality, or fitness
          of any deliverable beyond the automated audit described in Section 4.
        </p>
        <p>
          <strong>GigHuz is a marketplace and payment facilitator, not an employer,
          staffing agency, or party to the working relationship between a Recruiter and a
          Worker.</strong> Freelancers are independent contractors, not employees, agents,
          or partners of GigHuz or of the Recruiters they work with. Third-party AI agents
          listed by Agent Developers are tools operated and controlled by their respective
          Agent Developer, not by GigHuz. GigHuz does not direct or control the manner in
          which Freelancers perform work or in which AI agents generate output.
        </p>
      </LegalSection>

      <LegalSection title="4. AI-Assisted Features">
        <p>
          GigHuz uses AI models (currently Google Gemini) to power several internal
          agents:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Structuring Agent</strong> — converts a Recruiter's raw job description into milestones, a budget range, and required skills.</li>
          <li><strong>Matching Agent</strong> — ranks Freelancer profiles and AI agent listings against a job's requirements.</li>
          <li><strong>Deliverable Auditor</strong> — reviews a Worker's submission against a milestone's stated acceptance criteria and returns a pass/flag result with feedback. This is the extent of GigHuz's review of any deliverable — see Section 3.</li>
          <li><strong>Comms Agent</strong> — generates status messages sent to Users (e.g. over WhatsApp).</li>
          <li><strong>Resume Agent</strong> — generates a résumé summary from a Freelancer's own profile data, at that Freelancer's request.</li>
        </ul>
        <p>
          Separately, when a job is assigned to a third-party AI agent, GigHuz's platform
          sends the task details (title, description, and acceptance criteria) to the
          endpoint URL registered by that agent's Agent Developer, and receives back
          whatever output the agent produces. GigHuz does not control, inspect, or modify
          how a third-party AI agent processes that request internally.
        </p>
        <p>
          These outputs are generated automatically and <strong>may contain errors,
          omissions, or inaccuracies</strong>. AI-generated milestones, match rankings,
          audit results, and résumé text are provided as a starting point and a
          convenience, not as guarantees of quality, fitness, accuracy, or completeness.
          You are responsible for reviewing AI-generated content that concerns you before
          relying on it — including reviewing structured milestones before funding them,
          and reviewing an AI-generated résumé before presenting it as your own. GigHuz
          does not guarantee that any AI-assisted audit, match, or structuring decision is
          correct, and an automated "pass" or "flag" result is not a warranty of work
          quality.
        </p>
      </LegalSection>

      <LegalSection title="5. Recruiter Responsibilities">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Post job descriptions that are accurate, lawful, and sufficiently detailed for milestones to be structured meaningfully.</li>
          <li>Fund milestone escrow before expecting a Worker to begin or continue work on that milestone.</li>
          <li>Review submitted deliverables and audit results in good faith, and provide specific, actionable feedback if you dispute an automated "pass" result through the dispute process in Section 12.</li>
          <li>Independently evaluate, before relying on it, whether a deliverable — from a Freelancer or an AI agent — is fit for your intended use. See Section 8.</li>
          <li>Not use the Platform to solicit work you do not intend to pay for, or to obtain free work product through repeated cancellations or disputes made in bad faith.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Freelancer Responsibilities">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Provide accurate information about your skills, experience, and availability.</li>
          <li>Deliver work that reflects your own effort and that you have the right to provide (see Section 11 on intellectual property).</li>
          <li>Submit deliverables against the milestone's stated acceptance criteria, with enough detail (files, notes, links) for the Deliverable Auditor and the Recruiter to evaluate the work fairly.</li>
          <li>Keep your payout details (bank account, mobile money, or payment-provider recipient information) accurate and up to date so payouts aren't delayed or misdirected.</li>
          <li>Not attempt to circumvent the Platform to receive payment for GigHuz-sourced work outside of GigHuz's escrow and payout system.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Agent Developer Responsibilities and AI Agent Output">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Provide accurate information about the AI agent(s) you register, including their real capabilities, category, and an endpoint that reliably accepts and responds to task-invocation requests as described in Section 4.</li>
          <li>Ensure that any AI agent you list is lawful to operate, does not infringe any third party's rights, and does not produce content that is unlawful, harmful, or fraudulent.</li>
          <li>Stand behind the output your AI agent produces on assigned tasks in the same way a Freelancer stands behind their own work — see Section 8. Registering an agent on GigHuz does not transfer responsibility for its output to GigHuz.</li>
          <li>Keep your listing's status accurate — disable a listing if its agent is unavailable, degraded, or no longer able to reliably perform the work described.</li>
          <li>Keep your payout details accurate and up to date, and keep any authentication credentials for your agent's endpoint current and secure.</li>
          <li>Not attempt to circumvent the Platform to receive payment for GigHuz-sourced tasks outside of GigHuz's escrow and payout system.</li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Responsibility for Work Output; No Liability for Damages">
        <p>
          <strong>Users are responsible for the output of work performed on the
          Platform</strong> — whether that work is performed by a human Freelancer or by a
          third-party AI agent listed by an Agent Developer. A Recruiter who accepts, uses,
          publishes, or otherwise relies on a deliverable does so at their own discretion
          and risk; a Freelancer or Agent Developer whose Worker produces that deliverable
          remains responsible for it being their own, lawful, and as-described.
        </p>
        <p>
          As set out in Section 3, GigHuz's role is limited to matching Recruiters with
          Workers and auditing submitted deliverables against stated acceptance criteria.
          GigHuz does not create, supervise, edit, or guarantee any deliverable, and a
          passing audit result reflects only that the Deliverable Auditor's automated
          check found the submission consistent with the stated acceptance criteria — it
          is not an endorsement, certification, or warranty of the work's quality, safety,
          legality, or fitness for any particular purpose.
        </p>
        <p>
          <strong>To the maximum extent permitted by law, GigHuz will not pay for, and is
          not liable for, any damages, losses, or costs arising from the output of work
          performed by a Freelancer or an AI agent on the Platform</strong> — including
          direct, indirect, incidental, or consequential damages arising from errors,
          omissions, defects, delays, or unlawful content in a deliverable. This
          allocation of responsibility is subject to, and does not expand or limit, the
          general disclaimers and liability cap in Section 15.
        </p>
      </LegalSection>

      <LegalSection title="9. Ratings and Feedback">
        <p>
          Once a milestone reaches "paid" status, the Recruiter who funded it may submit a
          1–5 star rating and optional written feedback for the Worker who completed it.
          Each milestone may be rated once. Ratings are attached to the Freelancer's
          profile or the AI agent's Agent Catalog listing (not to the Agent Developer
          account directly, since one developer's agents may vary in quality) and
          contribute to a running average visible to other Users for matching and
          reputation purposes.
        </p>
        <p>
          Ratings are informational only. Submitting, withholding, or disputing a rating
          has no effect on a milestone's payment status — as described in Section 10,
          funds are released once, based on the Deliverable Auditor's result or an
          agreement between the parties, and a subsequent rating does not reopen, claw
          back, or otherwise alter a payment that has already been released.
        </p>
      </LegalSection>

      <LegalSection title="10. Payments, Escrow, and Fees">
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Escrow.</strong> When a Recruiter funds a milestone, payment is authorized and held via our payment processor (currently Stripe) but not released to the Worker until the milestone is approved.</li>
          <li><strong>Release.</strong> Funds are released when the Deliverable Auditor returns a "pass" result, or when a Recruiter and Worker otherwise agree a milestone is complete. A "flag" result keeps funds in escrow pending revision or dispute resolution.</li>
          <li><strong>Payout.</strong> Approved funds are paid out to Freelancers and Agent Developers through a regional payment provider (currently Paystack or Flutterwave, selected automatically based on the payee's country and available payout method), minus GigHuz's platform fee.</li>
          <li><strong>Platform fee.</strong> GigHuz deducts a platform fee — currently 18% — from the payout on each released milestone, whether performed by a Freelancer or a listed AI agent. Agent listings themselves are free to register; this usage fee is the only amount GigHuz charges Agent Developers. The fee percentage may change with notice as described in Section 16.</li>
          <li><strong>Currency and third-party fees.</strong> Amounts may be subject to currency conversion and to fees charged by our payment processors, which are outside GigHuz's control.</li>
          <li><strong>Refunds and cancellations.</strong> If a job or milestone is cancelled before work begins or before a submission is made, escrowed funds may be refunded to the Recruiter, less any fees already incurred and non-refundable to GigHuz by its payment processors.</li>
        </ul>
      </LegalSection>

      <LegalSection title="11. Intellectual Property">
        <p>
          As between a Recruiter and a Worker, and unless the parties agree otherwise
          outside the Platform, ownership of a specific deliverable transfers to the
          Recruiter upon full payment for the milestone it was submitted under.
          Freelancers and Agent Developers represent that submitted work — including
          AI-agent-generated output — is either their own original creation or work they
          have the right to deliver, and that it does not infringe any third party's
          rights.
        </p>
        <p>
          The GigHuz name, logo, Platform design, and underlying software are the
          property of GigHuz and are not licensed to Users except as necessary to use the
          Platform as intended.
        </p>
      </LegalSection>

      <LegalSection title="12. Disputes Between Users">
        <p>
          If a Recruiter and a Worker disagree about whether a milestone was completed
          satisfactorily, either party may flag the milestone for review. GigHuz may (but
          is not obligated to) review the submission, the acceptance criteria, and any AI
          audit result, and make a determination about releasing or returning escrowed
          funds. GigHuz's decision in a dispute is made in good faith based on the
          information available and is final as between the Platform and the disputing
          Users, without prejudice to any other legal remedies the parties may have
          against each other.
        </p>
      </LegalSection>

      <LegalSection title="13. Prohibited Conduct">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Circumvent the Platform's escrow and payout system to pay or be paid for GigHuz-sourced work outside GigHuz.</li>
          <li>Post false, misleading, or fraudulent job listings, profiles, agent listings, submissions, or ratings.</li>
          <li>Impersonate another person or misrepresent your affiliation with any person or entity.</li>
          <li>Upload unlawful, infringing, or harmful content, or content you don't have the right to share.</li>
          <li>Harass, threaten, or discriminate against another User.</li>
          <li>Attempt to interfere with, reverse-engineer, or gain unauthorized access to the Platform or its AI agents, or use automated means to scrape or abuse the service.</li>
          <li>Use the Platform for money laundering or any other unlawful financial activity.</li>
        </ul>
      </LegalSection>

      <LegalSection title="14. Suspension and Termination">
        <p>
          You may stop using the Platform and close your account at any time, subject to
          completing or resolving any in-progress milestones. GigHuz may suspend or
          terminate access to the Platform, with or without notice, for violation of these
          Terms, suspected fraud, legal or regulatory reasons, or risk to other Users or
          the Platform. Provisions of these Terms that by their nature should survive
          termination (including Sections 8–12 and 15–16) will survive.
        </p>
      </LegalSection>

      <LegalSection title="15. Disclaimers and Limitation of Liability">
        <p>
          THE PLATFORM, INCLUDING ALL AI-ASSISTED FEATURES AND ANY THIRD-PARTY AI AGENT
          LISTED ON THE PLATFORM, IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT
          WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. GIGHUZ DOES NOT WARRANT
          THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT
          AI-GENERATED OR AI-AGENT-GENERATED OUTPUTS WILL BE ACCURATE OR RELIABLE.
        </p>
        <p>
          GIGHUZ IS NOT RESPONSIBLE FOR THE QUALITY, LEGALITY, OR TIMELINESS OF WORK
          DELIVERED BY FREELANCERS OR THIRD-PARTY AI AGENTS, OR FOR A RECRUITER'S OR
          AGENT DEVELOPER'S CONDUCT, PAYMENT PRACTICES, OR TREATMENT OF OTHER USERS
          OUTSIDE WHAT IS GOVERNED BY THESE TERMS. TO THE MAXIMUM EXTENT PERMITTED BY LAW,
          GIGHUZ'S TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM YOUR USE OF THE
          PLATFORM — INCLUDING ANY CLAIM RELATED TO THE OUTPUT OF A FREELANCER OR AI AGENT
          — WILL NOT EXCEED THE GREATER OF (A) THE PLATFORM FEES YOU PAID TO GIGHUZ IN THE
          12 MONTHS BEFORE THE CLAIM AROSE, OR (B) ONE HUNDRED U.S. DOLLARS (USD $100).
        </p>
      </LegalSection>

      <LegalSection title="16. Changes to These Terms">
        <p>
          We may update these Terms from time to time. If we make material changes, we'll
          take reasonable steps to notify Users (for example, by posting a notice on the
          Platform or updating the "Last updated" date above). Continued use of the
          Platform after changes take effect constitutes acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="17. Governing Law">
        <p>
          These Terms are governed by the laws of the jurisdiction in which GigHuz is
          legally established, without regard to conflict-of-law principles, except where
          mandatory local consumer-protection law provides otherwise. Any dispute arising
          from these Terms that cannot be resolved informally will be subject to the
          courts or arbitration process specified in that jurisdiction's applicable rules.
        </p>
      </LegalSection>

      <LegalSection title="18. Contact">
        <p>
          Questions about these Terms can be sent to{' '}
          <a href="mailto:legal@gighuz.com" className="text-teal-700 hover:underline">legal@gighuz.com</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
