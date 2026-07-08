export const metadata = {
  title: "Privacy Policy — Eat Out Better",
};

export default function PrivacyPage() {
  return (
    <main style={styles.main}>
      <h1 style={styles.title}>Privacy Policy</h1>
      <p style={styles.meta}>Effective Date: June 25, 2026</p>
      <p style={styles.meta}>Last Updated: July 7, 2026</p>

      <Section title="1. Overview">
        <p>
          <strong>Eat Out Better</strong> ("we," "us," or "our") is operated by{" "}
          <strong>Dine Right LLC</strong>. This Privacy Policy explains how we handle
          information when you use our mobile application. We built this app with a minimal
          data footprint by design — we don't create accounts, we don't store your photos,
          and we don't retain your health information after your session ends.
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
          You may input a health condition (such as high cholesterol) to personalize your
          results. This information is used only to generate your in-session analysis and is
          not stored, shared, or linked to you in any way.
        </p>
        <h3 style={styles.subheading}>Device &amp; Usage Data</h3>
        <p>
          We collect basic technical information (device type, OS version, crash reports) and
          anonymous usage analytics (which screens you visit, whether an analysis succeeded,
          how long it took) to maintain and improve the app. Crash reports may include an IP
          address and, when an error occurs, a visual replay of the app screens leading up to
          it. This data is not linked to your health information, and menu photos are not
          included in analytics or crash reports.
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
        </ul>
        <p>
          We do not share your data with any other third parties, and we never sell your
          personal information.
        </p>
      </Section>

      <Section title="6. Data Retention">
        <p>
          We do not retain your photos or health information after your session. Device-level
          session data is stored locally on your device via AsyncStorage and is cleared when
          you uninstall the app. Analytics events, crash reports, and submitted feedback are
          retained by the providers listed in Section 5 under their standard retention
          policies; none of it contains your photos or health information.
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
          We use industry-standard practices to protect data in transit. Given our stateless
          architecture — no server-side storage of photos or health data — your exposure is
          minimized by design.
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
