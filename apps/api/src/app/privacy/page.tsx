export const metadata = {
  title: "Privacy Policy — Eat Out Better",
};

export default function PrivacyPage() {
  return (
    <main style={styles.main}>
      <h1 style={styles.title}>Privacy Policy</h1>
      <p style={styles.meta}>Effective Date: June 25, 2026</p>
      <p style={styles.meta}>Last Updated: September 30, 2026</p>

      <Section title="1. Overview">
        <p>
          <strong>Eat Out Better</strong> ("we," "us," or "our") is operated by{" "}
          <strong>Dine Right LLC</strong>. This Privacy Policy explains how we handle
          information when you use our mobile application.
        </p>
        <p>
          You never need to sign in to scan a menu. When you first open the app we create an
          anonymous account for you — a random identifier with no name, email or password — so
          your saved scans can be backed up. If you choose to sign in with Apple, Google or your
          email, that login is attached to the same account so your scans follow you to a new
          phone. You can delete your account, and everything in it, from inside the app at any
          time. We never store your menu photos, and we never sell your information.
        </p>
        <p>
          Your use of the app is also governed by our{" "}
          <a href="/terms">Terms of Service</a>, which explain what the app does and does
          not do — including that it does <strong>not</strong> detect food allergens and is
          not a substitute for medical advice.
        </p>
      </Section>

      <Section title="2. Who This App Is For">
        <p>
          Eat Out Better is intended for users 18 years of age or older. By using this app,
          you confirm you are at least 18. We do not knowingly collect information from
          anyone under 18. If we learn a user is under 18, we will cease processing their
          data immediately.
        </p>
      </Section>

      <Section title="3. What We Collect">
        <h3 style={styles.subheading}>Camera &amp; Photos</h3>
        <p>
          When you photograph a restaurant menu, that image is sent to our AI analysis
          service for processing. We do not store your photos on our servers. Once the
          analysis is complete, the image is discarded.
        </p>
        <h3 style={styles.subheading}>Health Context</h3>
        <p>
          You do not enter a health condition, diagnosis, or any other health information into
          the app. Eat Out Better scores every menu for one purpose — eating to manage
          cholesterol — and that setting is the same for every user. It is sent with each
          scan so the analysis knows what to score for; because everyone sends the same
          value, it is not information about you. When your saved scans are backed up to your
          account, this setting is removed first; it is never stored on our servers.
        </p>
        <h3 style={styles.subheading}>Your Account</h3>
        <p>
          When you first open the app we create an anonymous account: a random account
          identifier stored on your device and on our servers. It has no name, email or password.
        </p>
        <p>
          <strong>Saved scans.</strong> Each menu you scan is saved on your device and backed up
          to your account: the dishes read from the menu, their scores and the explanations. Your
          menu photos are not included, and neither is the health setting described above.
        </p>
        <p>
          <strong>If you sign in</strong>, we also store how you signed in and:
        </p>
        <ul>
          <li>
            <strong>Sign in with Apple</strong> — the email address Apple gives us (which can be a
            private relay address if you chose &quot;Hide My Email&quot;) and, only the first time
            and only if you share it, your name.
          </li>
          <li>
            <strong>Google</strong> — your email address and name from your Google account.
          </li>
          <li>
            <strong>Email</strong> — the address you enter. We send a 6-digit code to it each time
            you sign in; there is no password.
          </li>
        </ul>
        <h3 style={styles.subheading}>Device &amp; Usage Data</h3>
        <p>
          We collect basic technical information (device type, OS version, crash reports) and
          anonymous usage analytics (which screens you visit, whether an analysis succeeded,
          how long it took) to maintain and improve the app. Crash reports may include an IP
          address and, when an error occurs, a visual replay of the app screens leading up to
          it. This data is not linked to your health information, and menu photos are not
          included in analytics or crash reports.
        </p>
        <p>
          To tell a returning user from a new one, the app creates a random install
          identifier and keeps it in your device&apos;s secure keychain. It is attached to
          those anonymous analytics. It contains no name, email, or health information, and
          because the keychain outlives the app, it can persist if you delete and reinstall
          Eat Out Better. Analytics and crash reports are not linked to your account.
        </p>
        <h3 style={styles.subheading}>Feedback</h3>
        <p>
          If you choose to send feedback through the in-app feedback form, we collect the text
          and rating you submit, along with an anonymous app identifier so we can spot repeat
          issues. Feedback is optional and never required to use the app.
        </p>
      </Section>

      <Section title="4. How We Use Your Information">
        <ul>
          <li>To analyze menu photos and return personalized dish recommendations</li>
          <li>
            To create and keep your account, and to back up your saved scans and restore them on
            your devices
          </li>
          <li>To send you sign-in codes by email, when you choose email sign-in</li>
          <li>To maintain and improve app performance</li>
          <li>We do not use your information for advertising</li>
          <li>We do not sell your personal information to anyone, ever</li>
        </ul>
      </Section>

      <Section title="5. Third-Party Services">
        <p>
          We use a small number of service providers, each acting as a data processor on our
          behalf:
        </p>
        <ul>
          <li>
            <strong>Anthropic, PBC (Claude API)</strong> — processes your menu photos and
            health context to generate the analysis. Photos are not retained after
            processing. Privacy policy:{" "}
            <a href="https://anthropic.com/privacy">anthropic.com/privacy</a>.
          </li>
          <li>
            <strong>PostHog, Inc.</strong> — anonymous product analytics (screen views,
            scan funnel events, error types). No photos or health details are sent.
            Privacy policy: <a href="https://posthog.com/privacy">posthog.com/privacy</a>.
          </li>
          <li>
            <strong>Sentry (Functional Software, Inc.)</strong> — crash reporting and
            error diagnostics, including session replays of app screens when an error
            occurs. Privacy policy:{" "}
            <a href="https://sentry.io/privacy/">sentry.io/privacy</a>.
          </li>
          <li>
            <strong>Google LLC</strong> — in-app feedback you submit is stored in a Google
            Sheet operated by us. Privacy policy:{" "}
            <a href="https://policies.google.com/privacy">policies.google.com/privacy</a>.
          </li>
          <li>
            <strong>Vercel Inc.</strong> — hosts the service that receives your menu photos
            and passes them to the analysis provider above. Photos are processed in memory and
            are not written to storage. Standard server logs may include an IP address.
            Privacy policy: <a href="https://vercel.com/legal/privacy-policy">vercel.com/legal/privacy-policy</a>.
          </li>
          <li>
            <strong>Expo (650 Industries, Inc.)</strong> — delivers over-the-air app updates.
            Your device contacts Expo to check for updates; no photos, health information, or
            feedback are sent. Privacy policy:{" "}
            <a href="https://expo.dev/privacy">expo.dev/privacy</a>.
          </li>
          <li>
            <strong>Supabase, Inc.</strong> — stores your account and your saved scans, in the
            United States. Each account can read only its own records, enforced by the database
            itself. Privacy policy:{" "}
            <a href="https://supabase.com/privacy">supabase.com/privacy</a>.
          </li>
          <li>
            <strong>Resend</strong> — delivers sign-in code emails. It receives your email address
            and the code, nothing else. Privacy policy:{" "}
            <a href="https://resend.com/legal/privacy-policy">resend.com/legal/privacy-policy</a>.
          </li>
          <li>
            <strong>Apple</strong> and <strong>Google</strong> — only if you choose to sign in with
            them, under their own privacy policies.
          </li>
        </ul>
        <p>
          We do not share your data with any other third parties, and we never sell your
          personal information.
        </p>
      </Section>

      <Section title="6. Data Retention">
        <p>
          Menu photos are never retained. Your saved scans are kept on your device and in your
          account until you clear them (Saved scans → Clear, which removes them from both) or
          delete your account. Your account holds at most your 500 most recent scans; older ones
          are removed automatically.
        </p>
        <p>
          Signing out removes your scans from view on that phone but keeps them in your account.
          Deleting your account permanently removes your account and every scan saved to it, and,
          if you used Sign in with Apple, disconnects Eat Out Better from your Apple ID.
        </p>
        <p>
          Analytics events, crash reports and submitted feedback are kept by the providers in
          Section 5 under their standard retention policies; none of them contain your photos,
          your health setting or your account. The install identifier described in Section 3 may
          remain in your device&apos;s keychain after you delete the app.
        </p>
        <h3 style={styles.subheading}>Deleting Your Data</h3>
        <p>
          <strong>In the app:</strong> Account → Delete account. This is immediate and permanent.
          Deleting the app alone does <strong>not</strong> delete your account: your scans stay
          backed up, which is what lets you get them back on a new phone.
        </p>
        <p>
          For anything else — a copy of your data, a correction, withdrawing consent for
          analytics, or deleting feedback you sent — email{" "}
          <a href="mailto:support@eatoutbetter.com">support@eatoutbetter.com</a>. We respond
          within 45 days.
        </p>
      </Section>

      <Section title="7. California Residents — CCPA Rights">
        <p>If you are a California resident, you have the right to:</p>
        <ul>
          <li>Know what personal information we collect and how it's used</li>
          <li>Request deletion of your personal information</li>
          <li>
            Opt out of the sale of your personal information (we do not sell personal
            information)
          </li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a href="mailto:support@eatoutbetter.com">support@eatoutbetter.com</a>.
        </p>
      </Section>

      <Section title="8. Security">
        <p>
          We protect data in transit and at rest using industry-standard practices. Sign-in
          tokens are kept in your device&apos;s secure keychain. Saved scans are held in a
          database where each account can reach only its own records, enforced by the database
          itself rather than only by our app. Menu photos are never stored. No system is
          perfectly secure, and we don&apos;t claim otherwise.
        </p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p>
          We may update this policy as the app evolves. We'll update the "Last Updated" date
          above. Continued use of the app after changes constitutes acceptance.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Questions or privacy requests:{" "}
          <a href="mailto:support@eatoutbetter.com">support@eatoutbetter.com</a>
        </p>
        <p>
          See also our <a href="/terms">Terms of Service</a>.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>{title}</h2>
      {children}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: 680,
    margin: "0 auto",
    padding: "40px 24px 80px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#1a1a1a",
    lineHeight: 1.7,
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 4,
  },
  meta: {
    color: "#666",
    fontSize: 14,
    margin: "2px 0",
  },
  section: {
    marginTop: 36,
  },
  heading: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    fontWeight: 600,
    marginTop: 16,
    marginBottom: 4,
  },
};
