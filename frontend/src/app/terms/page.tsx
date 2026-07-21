import { LegalLayout, LegalSection } from '@/components/LegalLayout';

export const metadata = { title: 'Terms of Use — GigHuz' };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Use" lastUpdated="July 21, 2026">
      <LegalSection title="1. Agreement to These Terms">
        <p>
          These Terms of Use ("Terms") govern access to and use of GigHuz (the "Platform"),
          operated by GigHuz ("GigHuz," "we," "us," or "our"). By creating an account,
          posting a job, submitting work, or otherwise using the Platform, you ("you" or
          "User") agree to be bound by these Terms and by our{' '}
          <a href="/privacy" className="text-teal-700 hover:underline">Privacy Policy</a>,
          which is incorporated by reference. If you do not agree, do not use the
          Platform.
        </p>
        <p>
          GigHuz connects two kinds of Users: <strong>Recruiters</strong> (also referred to
          as clients — individuals or organizations who post jobs and hire freelance
          talent) and <strong>Freelancers</strong> (individuals who offer services and
          complete work). References to "you" apply to whichever role your account holds,
          and some provisions in these Terms apply only to one role, as noted.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility and Accounts">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>You must be at least 18 years old and able to form a binding contract in your jurisdiction to use GigHuz.</li>
          <li>You may register using email/password, a Google account, or a phone number. You are responsible for the accuracy of the information you provide during onboarding and profile setup, including your name, country, skills, bio, and (for Freelancers) payout details.</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</li>
          <li>You agree to notify us promptly of any unauthorized use of your account.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. What GigHuz Is — and Isn't">
        <p>
          GigHuz is an AI-orchestrated marketplace that helps Recruiters describe work,
          get matched with Freelancers, and pay for completed deliverables. Several
          platform functions — job structuring, candidate matching, deliverable
          auditing, resume generation, and status notifications — are performed or
          assisted by artificial intelligence models (see Section 4).
        </p>
        <p>
          <strong>GigHuz is a marketplace and payment facilitator, not an employer,
          staffing agency, or party to the working relationship between a Recruiter and
          a Freelancer.</strong> Freelancers are independent contractors, not employees,
          agents, or partners of GigHuz or of the Recruiters they work with. GigHuz does
          not direct or control the manner in which Freelancers perform work.
        </p>
      </LegalSection>

      <LegalSection title="4. AI-Assisted Features">
        <p>
          GigHuz uses AI models (currently Google Gemini) to power several agents:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Structuring Agent</strong> — converts a Recruiter's raw job description into milestones, a budget range, and required skills.</li>
          <li><strong>Matching Agent</strong> — ranks Freelancer profiles against a job's requirements.</li>
          <li><strong>Deliverable Auditor</strong> — reviews a Freelancer's submission against a milestone's stated acceptance criteria and returns a pass/flag result with feedback.</li>
          <li><strong>Comms Agent</strong> — generates status messages sent to Users (e.g. over WhatsApp).</li>
          <li><strong>Resume Agent</strong> — generates a résumé summary from a Freelancer's own profile data, at that Freelancer's request.</li>
        </ul>
        <p>
          These outputs are generated automatically and <strong>may contain errors,
          omissions, or inaccuracies</strong>. AI-generated milestones, match rankings,
          audit results, and résumé text are provided as a starting point and a
          convenience, not as guarantees of quality, fitness, accuracy, or completeness.
          You are responsible for reviewing AI-generated content that concerns you
          before relying on it — including reviewing structured milestones before
          funding them, and reviewing an AI-generated résumé before presenting it as
          your own. GigHuz does not guarantee that any AI-assisted audit, match, or
          structuring decision is correct, and an automated "pass" or "flag" result is
          not a warranty of work quality.
        </p>
      </LegalSection>

      <LegalSection title="5. Recruiter Responsibilities">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Post job descriptions that are accurate, lawful, and sufficiently detailed for milestones to be structured meaningfully.</li>
          <li>Fund milestone escrow before expecting a Freelancer to begin or continue work on that milestone.</li>
          <li>Review submitted deliverables and audit results in good faith, and provide specific, actionable feedback if you dispute an automated "pass" result through the dispute process in Section 9.</li>
          <li>Not use the Platform to solicit work you do not intend to pay for, or to obtain free work product through repeated cancellations or disputes made in bad faith.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Freelancer Responsibilities">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Provide accurate information about your skills, experience, and availability.</li>
          <li>Deliver work that reflects your own effort and that you have the right to provide (see Section 7 on intellectual property).</li>
          <li>Submit deliverables against the milestone's stated acceptance criteria, with enough detail (files, notes, links) for the Deliverable Auditor and the Recruiter to evaluate the work fairly.</li>
          <li>Keep your payout details (bank account, mobile money, or payment-provider recipient information) accurate and up to date so payouts aren't delayed or misdirected.</li>
          <li>Not attempt to circumvent the Platform to receive payment for GigHuz-sourced work outside of GigHuz's escrow and payout system.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Payments, Escrow, and Fees">
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Escrow.</strong> When a Recruiter funds a milestone, payment is authorized and held via our payment processor (currently Stripe) but not released to the Freelancer until the milestone is approved.</li>
          <li><strong>Release.</strong> Funds are released when the Deliverable Auditor returns a "pass" result, or when a Recruiter and Freelancer otherwise agree a milestone is complete. A "flag" result keeps funds in escrow pending revision or dispute resolution.</li>
          <li><strong>Payout.</strong> Approved funds are paid out to Freelancers through a regional payment provider (currently Paystack or Flutterwave, selected automatically based on the Freelancer's country and available payout method), minus GigHuz's platform fee.</li>
          <li><strong>Platform fee.</strong> GigHuz deducts a platform fee — currently 18% — from the Freelancer's payout on each released milestone. The fee percentage may change with notice as described in Section 13.</li>
          <li><strong>Currency and third-party fees.</strong> Amounts may be subject to currency conversion and to fees charged by our payment processors, which are outside GigHuz's control.</li>
          <li><strong>Refunds and cancellations.</strong> If a job or milestone is cancelled before work begins or before a submission is made, escrowed funds may be refunded to the Recruiter, less any fees already incurred and non-refundable to GigHuz by its payment processors.</li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Intellectual Property">
        <p>
          As between a Recruiter and a Freelancer, and unless the parties agree
          otherwise outside the Platform, ownership of a specific deliverable transfers
          to the Recruiter upon full payment for the milestone it was submitted under.
          Freelancers represent that submitted work is either their own original
          creation or work they have the right to deliver, and that it does not
          infringe any third party's rights.
        </p>
        <p>
          The GigHuz name, logo, Platform design, and underlying software are the
          property of GigHuz and are not licensed to Users except as necessary to use
          the Platform as intended.
        </p>
      </LegalSection>

      <LegalSection title="9. Disputes Between Users">
        <p>
          If a Recruiter and Freelancer disagree about whether a milestone was
          completed satisfactorily, either party may flag the milestone for review.
          GigHuz may (but is not obligated to) review the submission, the acceptance
          criteria, and any AI audit result, and make a determination about releasing
          or returning escrowed funds. GigHuz's decision in a dispute is made in good
          faith based on the information available and is final as between the
          Platform and the disputing Users, without prejudice to any other legal
          remedies the parties may have against each other.
        </p>
      </LegalSection>

      <LegalSection title="10. Prohibited Conduct">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Circumvent the Platform's escrow and payout system to pay or be paid for GigHuz-sourced work outside GigHuz.</li>
          <li>Post false, misleading, or fraudulent job listings, profiles, submissions, or reviews.</li>
          <li>Impersonate another person or misrepresent your affiliation with any person or entity.</li>
          <li>Upload unlawful, infringing, or harmful content, or content you don't have the right to share.</li>
          <li>Harass, threaten, or discriminate against another User.</li>
          <li>Attempt to interfere with, reverse-engineer, or gain unauthorized access to the Platform or its AI agents, or use automated means to scrape or abuse the service.</li>
          <li>Use the Platform for money laundering or any other unlawful financial activity.</li>
        </ul>
      </LegalSection>

      <LegalSection title="11. Suspension and Termination">
        <p>
          You may stop using the Platform and close your account at any time, subject
          to completing or resolving any in-progress milestones. GigHuz may suspend or
          terminate access to the Platform, with or without notice, for violation of
          these Terms, suspected fraud, legal or regulatory reasons, or risk to other
          Users or the Platform. Provisions of these Terms that by their nature should
          survive termination (including Sections 7–9 and 12–13) will survive.
        </p>
      </LegalSection>

      <LegalSection title="12. Disclaimers and Limitation of Liability">
        <p>
          THE PLATFORM, INCLUDING ALL AI-ASSISTED FEATURES, IS PROVIDED "AS IS" AND "AS
          AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED,
          INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. GIGHUZ DOES NOT WARRANT THAT THE PLATFORM WILL BE
          UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT AI-GENERATED OUTPUTS WILL BE
          ACCURATE OR RELIABLE.
        </p>
        <p>
          GIGHUZ IS NOT RESPONSIBLE FOR THE QUALITY, LEGALITY, OR TIMELINESS OF WORK
          DELIVERED BY FREELANCERS, OR FOR A RECRUITER'S CONDUCT, PAYMENT PRACTICES, OR
          TREATMENT OF FREELANCERS OUTSIDE WHAT IS GOVERNED BY THESE TERMS. TO THE
          MAXIMUM EXTENT PERMITTED BY LAW, GIGHUZ'S TOTAL LIABILITY TO YOU FOR ANY CLAIM
          ARISING FROM YOUR USE OF THE PLATFORM WILL NOT EXCEED THE GREATER OF (A) THE
          PLATFORM FEES YOU PAID TO GIGHUZ IN THE 12 MONTHS BEFORE THE CLAIM AROSE, OR
          (B) ONE HUNDRED U.S. DOLLARS (USD $100).
        </p>
      </LegalSection>

      <LegalSection title="13. Changes to These Terms">
        <p>
          We may update these Terms from time to time. If we make material changes,
          we'll take reasonable steps to notify Users (for example, by posting a notice
          on the Platform or updating the "Last updated" date above). Continued use of
          the Platform after changes take effect constitutes acceptance of the revised
          Terms.
        </p>
      </LegalSection>

      <LegalSection title="14. Governing Law">
        <p>
          These Terms are governed by the laws of the jurisdiction in which GigHuz is
          legally established, without regard to conflict-of-law principles, except
          where mandatory local consumer-protection law provides otherwise. Any dispute
          arising from these Terms that cannot be resolved informally will be subject
          to the courts or arbitration process specified in that jurisdiction's
          applicable rules.
        </p>
      </LegalSection>

      <LegalSection title="15. Contact">
        <p>
          Questions about these Terms can be sent to{' '}
          <a href="mailto:legal@gighuz.com" className="text-teal-700 hover:underline">legal@gighuz.com</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
