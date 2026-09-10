export const metadata = {
  title: "Support — Eat Out Better",
};

/**
 * Support page.
 *
 * App Store Connect requires a Support URL that actually resolves, and a
 * reviewer will click it. Until now the entire web surface was /privacy, so
 * there was nothing to give it.
 *
 * Deliberately does NOT carry the postal address. The address exists on /terms
 * because a contract needs a notice address and Apple's EULA terms require a
 * developer address; repeating a residential address on a general-purpose
 * support page publishes it wider than anything requires.
 */

export default function SupportPage() {
  return (
    <main style={styles.main}>
      <h1 style={styles.title}>Support</h1>
      <p style={styles.lede}>
        Eat Out Better photographs a restaurant menu and ranks the dishes by their
        likely effect on your cholesterol. If something isn&apos;t working, or you think
        a score is wrong, we want to hear about it.
      </p>

      <div style={styles.contactCard}>
        <p style={styles.contactLabel}>Get in touch</p>
        <p style={styles.contactValue}>
          <a href="mailto:support@eatoutbetter.com">support@eatoutbetter.com</a>
        </p>
        <p style={styles.contactNote}>
          We aim to reply within a few days. For privacy requests, we respond within
          30 days.
        </p>
      </div>

      <Section title="Reporting a wrong score">
        <p>
          The fastest route is the in-app feedback form — tap <strong>Feedback</strong>{" "}
          at the bottom of the results screen, or the faces under &ldquo;Was this
          analysis helpful?&rdquo;. That sends us the context we need to find the
          problem.
        </p>
        <p>
          Please don&apos;t include personal or medical details in feedback. If you email
          instead, telling us the restaurant and the dish helps a lot.
        </p>
      </Section>

      <Section title="Common questions">
        <h3 style={styles.q}>Does the app detect allergens?</h3>
        <p>
          <strong>No.</strong> It does not identify peanuts, tree nuts, shellfish, eggs,
          milk, soy, wheat, sesame, gluten, or any other allergen, and it cannot tell you
          whether a dish is safe for you. If you have a food allergy or intolerance, ask
          the restaurant directly, every time.
        </p>

        <h3 style={styles.q}>Is this medical advice?</h3>
        <p>
          No. The app gives general dietary information to help you think about a menu.
          It is not a substitute for your doctor or dietitian. Always consult your own
          provider about your health.
        </p>

        <h3 style={styles.q}>What do the scores mean?</h3>
        <p>
          Each dish is scored from 1 to 10 for its likely effect on blood cholesterol,
          driven mainly by estimated saturated fat measured against about 13g — roughly
          a day&apos;s heart-healthy budget. The app estimates from a dish&apos;s name and
          description; it has no access to the kitchen or the recipe, so treat every
          score as a starting point rather than a measurement. Tap the{" "}
          <strong>?</strong> in the app for the full explanation.
        </p>

        <h3 style={styles.q}>Do you keep my photos?</h3>
        <p>
          No. Menu photos are analyzed and then discarded — they are never stored on our
          servers, and the app works without an account. See the{" "}
          <a href="/privacy">Privacy Policy</a> for the detail.
        </p>

        <h3 style={styles.q}>The camera won&apos;t open</h3>
        <p>
          Check that camera access is allowed in your device&apos;s Settings under
          Eat Out Better. You can also add photos from your library instead of taking
          them in the app.
        </p>

        <h3 style={styles.q}>I&apos;ve hit a daily limit</h3>
        <p>
          There is a per-device cap on scans each day, which keeps the service running
          for everyone. It resets the next day.
        </p>

        <h3 style={styles.q}>How do I delete my data?</h3>
        <p>
          Your scan history lives only on your device, so deleting the app removes it
          permanently. To withdraw consent for analytics and crash reporting, or to
          request deletion of feedback you submitted, email us and we will action it
          within 30 days.
        </p>
      </Section>

      <Section title="Legal">
        <p>
          <a href="/terms">Terms of Service</a> · <a href="/privacy">Privacy Policy</a>
        </p>
      </Section>

      <footer style={styles.footer}>
        <p style={styles.footerText}>
          Eat Out Better is operated by Dine Right LLC, a Colorado limited liability
          company. General dietary information only — not medical advice.
        </p>
      </footer>
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
    marginBottom: 8,
  },
  lede: {
    fontSize: 17,
    color: "#444",
    marginTop: 0,
  },
  contactCard: {
    marginTop: 24,
    padding: "18px 20px",
    background: "#f4f7f5",
    border: "1px solid #cfded5",
    borderLeft: "4px solid #1B4332",
    borderRadius: 4,
  },
  contactLabel: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#1B4332",
  },
  contactValue: {
    margin: "4px 0 0",
    fontSize: 18,
    fontWeight: 600,
  },
  contactNote: {
    margin: "8px 0 0",
    fontSize: 14,
    color: "#555",
  },
  section: {
    marginTop: 36,
  },
  heading: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
  },
  q: {
    fontSize: 15,
    fontWeight: 600,
    marginTop: 22,
    marginBottom: 2,
  },
  footer: {
    marginTop: 48,
    paddingTop: 18,
    borderTop: "1px solid #e0e0e0",
  },
  footerText: {
    color: "#666",
    fontSize: 14,
    margin: 0,
  },
};
