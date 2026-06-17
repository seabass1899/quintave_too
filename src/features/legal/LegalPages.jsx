/**
 * LegalPages.jsx — Privacy Policy & Terms of Service
 * src/features/legal/LegalPages.jsx
 *
 * Rendered as standalone pages (not modals) so they have real, linkable URLs
 * that Stripe and users can reach: /privacy and /terms.
 *
 * App.jsx intercepts the path/hash and renders <LegalPage which="privacy" /> or
 * <LegalPage which="terms" /> before the main app when the route matches.
 *
 * NOTE: These are solid, accurate starting drafts written for what Quintave
 * actually does. They are NOT a substitute for review by a lawyer — given the
 * sensitive nature of the data, have counsel review before relying on them
 * long-term.
 */

const CONTACT_EMAIL = 'sebastian.fortune212@quintave.app'
const COMPANY = 'Quintave'
const SITE = 'https://quintave.app'
const LAST_UPDATED = 'June 17, 2026'

const wrap = {
  minHeight: '100vh',
  background: '#f7f6f3',
  color: '#1a1a18',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '0 0 80px',
}
const inner = { maxWidth: 760, margin: '0 auto', padding: '0 24px' }
const headerBar = {
  borderBottom: '0.5px solid rgba(0,0,0,0.08)',
  padding: '20px 24px',
  marginBottom: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}
const h1 = { fontSize: 28, fontWeight: 700, margin: '0 0 6px' }
const sub = { fontSize: 13, color: '#888', margin: '0 0 32px' }
const h2 = { fontSize: 17, fontWeight: 700, margin: '32px 0 10px' }
const p = { fontSize: 14, lineHeight: 1.7, color: '#3a3a37', margin: '0 0 14px' }
const li = { fontSize: 14, lineHeight: 1.7, color: '#3a3a37', margin: '0 0 8px' }
const a = { color: '#1a1a18', textDecoration: 'underline' }
const backBtn = {
  fontSize: 13, padding: '8px 16px', borderRadius: 10,
  border: '0.5px solid rgba(0,0,0,0.12)', background: '#fff',
  color: '#1a1a18', cursor: 'pointer', textDecoration: 'none',
}

function Shell({ title, children }) {
  return (
    <div style={wrap}>
      <div style={headerBar}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{COMPANY}</div>
        <a href="/" style={backBtn}>← Back to app</a>
      </div>
      <div style={inner}>
        <h1 style={h1}>{title}</h1>
        <p style={sub}>Last updated: {LAST_UPDATED}</p>
        {children}
        <div style={{ marginTop: 48, paddingTop: 20, borderTop: '0.5px solid rgba(0,0,0,0.08)', fontSize: 13, color: '#888' }}>
          Questions? Contact us at <a href={`mailto:${CONTACT_EMAIL}`} style={a}>{CONTACT_EMAIL}</a>.
          {'  '}See also our{' '}
          {title.includes('Privacy')
            ? <a href="/terms" style={a}>Terms of Service</a>
            : <a href="/privacy" style={a}>Privacy Policy</a>}.
        </div>
      </div>
    </div>
  )
}

function PrivacyPolicy() {
  return (
    <Shell title="Privacy Policy">
      <p style={p}>
        This Privacy Policy explains how {COMPANY} ("we", "us") collects, uses, and
        protects your information when you use the {COMPANY} web application at {SITE}
        (the "Service"). By using the Service, you agree to the practices described here.
      </p>

      <h2 style={h2}>Who we are</h2>
      <p style={p}>
        {COMPANY} is operated as a sole proprietorship. For any privacy-related request
        or question, contact us at <a href={`mailto:${CONTACT_EMAIL}`} style={a}>{CONTACT_EMAIL}</a>.
        For privacy purposes, we act as the controller of your personal data.
      </p>

      <h2 style={h2}>Information we collect</h2>
      <p style={p}>We collect only what is needed to run the Service:</p>
      <ul>
        <li style={li}><strong>Account information.</strong> Your email address, used to create your account and sign you in with a one-time code.</li>
        <li style={li}><strong>Your practice data.</strong> The information you create in the app — assessment responses, daily check-ins, directives, reflections, ratings, notes, milestones, programs, and related self-development data. This is stored locally on your device and, when you sign in and sync, in our cloud database.</li>
        <li style={li}><strong>Subscription information.</strong> If you subscribe, your subscription status and billing are handled by Stripe. We store your subscription tier and status, plus identifiers that link your account to your Stripe customer record. We do not store your card number — Stripe processes all payment details directly.</li>
        <li style={li}><strong>Limited technical data.</strong> Basic information such as your browser/device type and an app version, used to keep the Service working and diagnose issues. We use minimal product analytics about feature usage to improve the Service.</li>
      </ul>

      <h2 style={h2}>Sensitive personal information</h2>
      <p style={p}>
        The practice data you enter may reflect personal reflections about your habits,
        emotions, and wellbeing. We treat this as sensitive and handle it with care. We do
        not sell it, and we do not use it for advertising. You choose what to enter, and you
        can export or delete it at any time (see "Your rights" below).
      </p>

      <h2 style={h2}>How we use your information</h2>
      <ul>
        <li style={li}>To provide the Service — store your data, sync it across your devices, and generate your personalized guidance and insights.</li>
        <li style={li}>To authenticate you and keep your account secure.</li>
        <li style={li}>To process and manage your subscription.</li>
        <li style={li}>To diagnose problems, maintain reliability, and improve the Service.</li>
        <li style={li}>To communicate with you about your account or the Service (for example, sign-in codes and important notices).</li>
      </ul>
      <p style={p}>
        We do not sell your personal information, and we do not share it with advertisers.
      </p>

      <h2 style={h2}>Service providers we use</h2>
      <p style={p}>We rely on a small number of trusted providers to operate the Service:</p>
      <ul>
        <li style={li}><strong>Supabase</strong> — database, authentication, and cloud storage of your account and practice data.</li>
        <li style={li}><strong>Stripe</strong> — subscription billing and payment processing.</li>
        <li style={li}><strong>Resend</strong> — sending transactional email such as your sign-in codes.</li>
        <li style={li}><strong>Vercel</strong> — hosting and delivery of the application.</li>
      </ul>
      <p style={p}>
        These providers process data on our behalf under their own security and privacy
        commitments, and only as needed to deliver their part of the Service.
      </p>

      <h2 style={h2}>Data storage and security</h2>
      <p style={p}>
        Your data is stored in your browser's local storage and, when you sign in, in our
        Supabase database. We use access controls so that you can read and write only your
        own data. Sign-in uses one-time email codes rather than passwords. While no method of
        storage or transmission is completely secure, we take reasonable measures to protect
        your information.
      </p>

      <h2 style={h2}>Data retention</h2>
      <p style={p}>
        We keep your account and practice data for as long as your account is active. If you
        delete your account, we delete the personal data associated with it, except where we
        must retain limited records to meet legal, tax, or accounting obligations (for example,
        billing records). Locally stored data remains on your device until you clear it.
      </p>

      <h2 style={h2}>Your rights</h2>
      <p style={p}>
        Depending on where you live, you may have rights to access, correct, export, or delete
        your personal data, and to object to or restrict certain processing. {COMPANY} honors
        these rights for all users:
      </p>
      <ul>
        <li style={li}><strong>Access &amp; export.</strong> You can export your data from within the app at any time.</li>
        <li style={li}><strong>Deletion.</strong> You can request deletion of your account and associated data by contacting <a href={`mailto:${CONTACT_EMAIL}`} style={a}>{CONTACT_EMAIL}</a> (or using the in-app account deletion option where available).</li>
        <li style={li}><strong>Other requests.</strong> Email us and we will respond within the timeframe required by applicable law.</li>
      </ul>
      <p style={p}>
        If you are in the EEA/UK (GDPR) or California (CCPA/CPRA), you have additional specific
        rights; contact us to exercise them and we will not discriminate against you for doing so.
      </p>

      <h2 style={h2}>Children</h2>
      <p style={p}>
        The Service is not directed to children under 16, and we do not knowingly collect
        personal data from them. If you believe a child has provided us data, contact us and
        we will delete it.
      </p>

      <h2 style={h2}>International users</h2>
      <p style={p}>
        We operate in the United States, and your data may be processed there or in other
        countries where our service providers operate. By using the Service you understand your
        data may be transferred to and processed in these locations.
      </p>

      <h2 style={h2}>Changes to this policy</h2>
      <p style={p}>
        We may update this Privacy Policy from time to time. When we do, we will revise the
        "Last updated" date above and, where appropriate, notify you within the Service.
      </p>

      <h2 style={h2}>Contact</h2>
      <p style={p}>
        For any privacy question or request, contact{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} style={a}>{CONTACT_EMAIL}</a>.
      </p>
    </Shell>
  )
}

function Terms() {
  return (
    <Shell title="Terms of Service">
      <p style={p}>
        These Terms of Service ("Terms") govern your use of the {COMPANY} web application at{' '}
        {SITE} (the "Service"), operated by {COMPANY}. By creating an account or using the
        Service, you agree to these Terms. If you do not agree, do not use the Service.
      </p>

      <h2 style={h2}>Not medical or mental-health advice</h2>
      <p style={p}>
        <strong>{COMPANY} is a personal self-development and wellness tool. It is not a medical
        device, and it does not provide medical care, psychological therapy, diagnosis, or
        treatment.</strong> The content, guidance, assessments, and insights in the Service are
        for general self-improvement and informational purposes only, and are not a substitute
        for professional advice from a qualified physician, therapist, or other licensed
        healthcare provider. Always seek the advice of a qualified professional with any
        questions about your physical or mental health. Never disregard professional advice or
        delay seeking it because of something you read or used in the Service.
      </p>
      <p style={p}>
        <strong>If you are experiencing a medical or mental-health emergency, or are in crisis,
        contact your local emergency services or a crisis hotline immediately.</strong> The
        Service is not designed for, and must not be relied on in, emergencies.
      </p>

      <h2 style={h2}>Eligibility &amp; accounts</h2>
      <p style={p}>
        You must be at least 16 years old (or the age of digital consent in your jurisdiction)
        to use the Service. You are responsible for the activity under your account and for
        keeping access to your email secure, since sign-in uses one-time codes sent to your
        email. Provide accurate information and keep it current.
      </p>

      <h2 style={h2}>Subscriptions &amp; billing</h2>
      <ul>
        <li style={li}>The Service offers optional paid subscriptions (for example, monthly and annual plans). Prices and features are shown in the app at the time of purchase.</li>
        <li style={li}>Payments are processed by Stripe. By subscribing, you authorize us, through Stripe, to charge your payment method on a recurring basis until you cancel.</li>
        <li style={li}>Subscriptions renew automatically at the end of each billing period unless you cancel before the renewal date.</li>
        <li style={li}>You can cancel at any time; your paid access continues until the end of the current billing period. Unless required by law, payments are non-refundable.</li>
        <li style={li}>We may change prices or plan features. We will give reasonable notice of material changes, and changes will not apply retroactively to a period you have already paid for.</li>
      </ul>

      <h2 style={h2}>Acceptable use</h2>
      <p style={p}>You agree not to:</p>
      <ul>
        <li style={li}>Use the Service for any unlawful purpose or in violation of these Terms.</li>
        <li style={li}>Attempt to access accounts or data that are not yours, or interfere with the security or integrity of the Service.</li>
        <li style={li}>Reverse engineer, scrape, or attempt to extract source code except as permitted by law.</li>
        <li style={li}>Resell, sublicense, or commercially exploit the Service without our written permission.</li>
      </ul>

      <h2 style={h2}>Your content &amp; data</h2>
      <p style={p}>
        You own the data you create in the Service. You grant us a limited license to store and
        process it solely to operate and improve the Service for you, as described in our{' '}
        <a href="/privacy" style={a}>Privacy Policy</a>. You can export or delete your data as
        described there.
      </p>

      <h2 style={h2}>Intellectual property</h2>
      <p style={p}>
        The Service itself — including its software, design, framework, and content we provide
        — is owned by {COMPANY} and protected by intellectual-property laws. We grant you a
        personal, non-exclusive, non-transferable right to use the Service in accordance with
        these Terms.
      </p>

      <h2 style={h2}>Availability &amp; changes</h2>
      <p style={p}>
        We work to keep the Service available and reliable, but we provide it "as is" and do not
        guarantee it will be uninterrupted or error-free. We may modify, suspend, or discontinue
        features at any time. We are not liable for any loss resulting from downtime, data loss,
        or changes to the Service, though we make reasonable efforts to protect and back up your
        synced data.
      </p>

      <h2 style={h2}>Disclaimers &amp; limitation of liability</h2>
      <p style={p}>
        To the fullest extent permitted by law, the Service is provided "as is" and "as
        available" without warranties of any kind, whether express or implied, including
        warranties of merchantability, fitness for a particular purpose, and non-infringement.
        We do not warrant that the Service will meet your requirements or produce any particular
        result.
      </p>
      <p style={p}>
        To the fullest extent permitted by law, {COMPANY} will not be liable for any indirect,
        incidental, special, consequential, or punitive damages, or any loss of data, arising
        from your use of the Service. Our total liability for any claim relating to the Service
        will not exceed the amount you paid us in the twelve months before the claim arose.
      </p>

      <h2 style={h2}>Termination</h2>
      <p style={p}>
        You may stop using the Service and delete your account at any time. We may suspend or
        terminate your access if you violate these Terms or use the Service in a way that could
        harm us or other users. On termination, your right to use the Service ends; sections
        that by their nature should survive (such as disclaimers and limitations of liability)
        will survive.
      </p>

      <h2 style={h2}>Governing law</h2>
      <p style={p}>
        These Terms are governed by the laws of the United States and the State of Texas,
        without regard to conflict-of-laws principles. Any disputes will be handled in the
        courts located in Texas, unless applicable law requires otherwise.
      </p>

      <h2 style={h2}>Changes to these Terms</h2>
      <p style={p}>
        We may update these Terms from time to time. When we do, we will revise the "Last
        updated" date above and, where appropriate, notify you within the Service. Your
        continued use after changes take effect constitutes acceptance.
      </p>

      <h2 style={h2}>Contact</h2>
      <p style={p}>
        Questions about these Terms? Contact{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} style={a}>{CONTACT_EMAIL}</a>.
      </p>
    </Shell>
  )
}

export default function LegalPage({ which }) {
  return which === 'terms' ? <Terms /> : <PrivacyPolicy />
}
