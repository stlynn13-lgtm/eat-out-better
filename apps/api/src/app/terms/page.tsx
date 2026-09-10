export const metadata = {
  title: "Terms of Service — Eat Out Better",
};

/**
 * Hosted Terms of Service.
 *
 * Three audiences, in this order of importance:
 *
 *   1. A user who taps "Terms" in the app. Section 3 is written for them —
 *      plain language, no defined-term soup — because under Colorado's
 *      Jones v. Dressel factors an exculpatory clause is enforced only where
 *      the intention is expressed in "clear and unambiguous language". Legalese
 *      that a reader cannot follow is not a stronger release, it is a weaker one.
 *   2. App Store review. Section 20 carries Apple's required minimum EULA terms
 *      verbatim in substance; without them Apple's own standard EULA applies,
 *      and that one contains no medical disclaimer at all.
 *   3. A court, if it ever comes to that. Sections 13-19 are the load-bearing
 *      ones and are set in caps for conspicuousness (UCC § 2-316).
 *
 * The URL is referenced from the app (app/index.tsx, components/TermsGate.tsx),
 * from the privacy policy, and must be entered in App Store Connect as the
 * EULA URL. If this path ever changes, all four have to change with it.
 */

const EFFECTIVE_DATE = "September 9, 2026";
const VERSION = "1.0";

export default function TermsPage() {
  return (
    <main style={styles.main}>
      <h1 style={styles.title}>Terms of Service</h1>
      <p style={styles.meta}>Effective Date: {EFFECTIVE_DATE}</p>
      <p style={styles.meta}>Version {VERSION}</p>

      <div style={styles.callout}>
        <p style={styles.calloutText}>
          <strong>Read Section 3 before you use this app.</strong> It explains what Eat
          Out Better does and — just as importantly — what it does not do. In
          particular, this app does <strong>not</strong> detect food allergens, and it
          is not a substitute for advice from your doctor. Sections 13 through 19 limit
          our liability and require most disputes to be resolved by individual
          arbitration rather than in court.
        </p>
      </div>

      <Section title="1. Agreement to These Terms">
        <p>
          These Terms of Service (the "<strong>Terms</strong>") are a binding contract
          between you and <strong>Dine Right LLC</strong>, a Colorado limited liability
          company ("<strong>Dine Right</strong>," "<strong>we</strong>,"{" "}
          "<strong>us</strong>," or "<strong>our</strong>"), governing your use of the
          Eat Out Better mobile application and any related services we provide (together,
          the "<strong>App</strong>").
        </p>
        <p>
          You accept these Terms by tapping "I Agree" when the App first asks you to, or
          by using the App. <strong>If you do not agree, do not use the App</strong> — and
          delete it from your device.
        </p>
        <p>
          These Terms incorporate our{" "}
          <a href="/privacy">Privacy Policy</a>, which explains what information the App
          handles and what it does not.
        </p>
      </Section>

      <Section title="2. Who May Use the App">
        <p>
          You must be <strong>18 years of age or older</strong> to use the App. By using
          it you confirm that you are. We do not knowingly permit use by anyone under 18,
          and we will stop processing the information of any user we learn is under 18.
        </p>
        <p>
          You must also have the legal capacity to enter into a contract, and you must not
          be barred from using the App under the laws of the United States or your place of
          residence.
        </p>
      </Section>

      <Section title="3. What Eat Out Better Is — and What It Is Not">
        <p>
          Eat Out Better lets you photograph a restaurant menu. It reads the dish names and
          descriptions from your photographs using artificial intelligence, estimates how
          each dish is likely to affect blood cholesterol based mainly on its probable
          saturated fat content, and presents those estimates as scores, explanations, and
          suggested substitutions.
        </p>

        <h3 style={styles.subheading}>It is general information, not medical advice</h3>
        <p>
          Everything the App produces is <strong>general dietary information for
          educational purposes only</strong>. It is not medical advice, diagnosis, or
          treatment, and it is not a substitute for the judgment of a physician, registered
          dietitian, or other qualified health professional who knows your history.
        </p>
        <p>
          <strong>Using the App does not create a doctor-patient, dietitian-client, or any
          other professional relationship</strong> between you and Dine Right or anyone
          associated with it. Always consult your own healthcare provider before making
          decisions about your diet, and never disregard or delay professional medical
          advice because of something you read in the App.
        </p>

        <h3 style={styles.subheading}>
          It does not detect allergens, and must never be used for that
        </h3>
        <div style={styles.warning}>
          <p style={styles.warningText}>
            <strong>
              THE APP DOES NOT IDENTIFY, DETECT, OR WARN ABOUT FOOD ALLERGENS OR
              INTOLERANCES.
            </strong>{" "}
            It does not detect peanuts, tree nuts, shellfish, fish, eggs, milk, soy, wheat,
            sesame, gluten, or any other allergen or ingredient that may cause you harm. It
            does not identify whether a dish is safe for any medical diet, and it does not
            know how a dish is actually prepared or whether it has come into contact with
            other foods.
          </p>
          <p style={styles.warningText}>
            <strong>
              IF YOU HAVE A FOOD ALLERGY, INTOLERANCE, OR ANY CONDITION THAT MAKES A
              PARTICULAR FOOD DANGEROUS TO YOU, DO NOT RELY ON THIS APP. ASK THE
              RESTAURANT DIRECTLY, EVERY TIME.
            </strong>
          </p>
        </div>

        <h3 style={styles.subheading}>It looks at one thing</h3>
        <p>
          The App's scores currently address <strong>only</strong> the likely effect of a
          dish on blood cholesterol, driven mainly by estimated saturated fat. They do not
          address sodium, added sugar, total calories, carbohydrates, portion size, alcohol,
          caffeine, drug-food interactions, or any other nutritional or medical factor,
          and they are not tailored to any condition other than high cholesterol. A dish
          that scores well in the App may still be a poor choice for you for reasons the
          App never considered.
        </p>

        <h3 style={styles.subheading}>The estimates are inferences, not measurements</h3>
        <p>
          The App does not analyze food. It reads text from a photograph and makes an
          informed guess from a dish's name and description about ingredients and cooking
          methods that the menu usually does not state. It has no access to the
          restaurant's recipes, suppliers, portion sizes, or kitchen. Two dishes with the
          same name at two restaurants can differ enormously, and the App cannot tell.
        </p>
      </Section>

      <Section title="4. Artificial Intelligence, and What It Gets Wrong">
        <p>
          The App is powered by third-party artificial intelligence models. You acknowledge
          and accept the following, which are inherent to that technology and not defects we
          can promise to eliminate:
        </p>
        <ul>
          <li>
            <strong>Output can be wrong.</strong> AI models produce plausible-sounding
            results that are sometimes inaccurate, incomplete, or fabricated, including
            confident statements about ingredients that are not in the dish.
          </li>
          <li>
            <strong>Reading a photograph can fail.</strong> Lighting, angle, handwriting,
            unusual fonts, glare, and damage to a menu can all cause the App to misread a
            dish, attribute a description to the wrong item, or miss items entirely.
          </li>
          <li>
            <strong>Results are not guaranteed to be consistent.</strong> The same menu
            photographed twice may not produce identical scores.
          </li>
          <li>
            <strong>Scores are approximations.</strong> A numeric score, including one
            shown to a decimal place, expresses a relative estimate. It does not represent
            a laboratory measurement or any clinically validated value.
          </li>
        </ul>
        <p>
          <strong>You are responsible for using judgment.</strong> Treat every result as a
          starting point for a conversation with the restaurant and your healthcare
          provider — never as a final answer.
        </p>
      </Section>

      <Section title="5. Assumption of Risk">
        <p>
          Food choices are personal, and their consequences depend on facts we cannot see:
          your health, your medications, your other meals, how a kitchen actually prepares a
          dish. <strong>You use the App voluntarily, and you knowingly and freely assume all
          risk arising from your reliance on it</strong>, including the risk that a score,
          explanation, or substitution suggestion is wrong.
        </p>
        <p>
          You agree that you are solely responsible for what you choose to eat, and that
          you will verify anything that matters to your health with the restaurant and with
          your healthcare provider before you rely on it.
        </p>
      </Section>

      <Section title="6. Your Photographs and Other Content">
        <p>
          You keep ownership of the photographs you take and anything else you submit
          ("<strong>Your Content</strong>"). To operate the App we need permission to use
          it, so you grant us a worldwide, non-exclusive, royalty-free licence to host,
          process, transmit, and analyze Your Content solely to provide the App to you and
          to maintain and improve it.
        </p>
        <p>
          As described in our <a href="/privacy">Privacy Policy</a>, menu photographs are
          processed and then discarded; we do not retain them.
        </p>
        <p>You represent and warrant that:</p>
        <ul>
          <li>
            you have the right to photograph and submit Your Content, and doing so does not
            infringe anyone's copyright, trademark, privacy, or other rights;
          </li>
          <li>
            Your Content does not contain other people's personal information, and does not
            depict identifiable people who have not consented; and
          </li>
          <li>
            Your Content is not unlawful, and you are not photographing anything you have
            been asked or instructed not to photograph.
          </li>
        </ul>
        <p>
          Menus and their descriptive text may be protected by copyright belonging to the
          restaurant or its designers. <strong>You are responsible for your own use of the
          App in relation to material owned by others</strong>, and Section 16 applies to
          any claim arising from Your Content.
        </p>
        <p>
          If you send us feedback or suggestions, you grant us an unrestricted, perpetual,
          royalty-free right to use them for any purpose without obligation to you. Please
          do not include personal or medical details in feedback.
        </p>
      </Section>

      <Section title="7. Licence to Use the App">
        <p>
          Subject to these Terms, we grant you a limited, personal, non-exclusive,
          non-transferable, non-sublicensable, revocable licence to install and use one copy
          of the App on an Apple-branded device that you own or control, for your own
          personal, non-commercial use, in accordance with the Usage Rules in Apple's Media
          Services Terms and Conditions.
        </p>
        <p>This licence does not permit you to, and you agree not to:</p>
        <ul>
          <li>
            copy, modify, translate, or create derivative works of the App, except as
            applicable law expressly permits despite this restriction;
          </li>
          <li>
            reverse engineer, decompile, or disassemble the App, or attempt to derive its
            source code, algorithms, prompts, or scoring logic;
          </li>
          <li>
            rent, lease, lend, sell, sublicense, or otherwise transfer the App or your
            rights under these Terms;
          </li>
          <li>remove or obscure any proprietary notice; or</li>
          <li>
            use the App to build a competing product, or to train any machine learning
            model.
          </li>
        </ul>
      </Section>

      <Section title="8. Acceptable Use">
        <p>You agree not to:</p>
        <ul>
          <li>
            use the App for any unlawful purpose, or in violation of any applicable law or
            regulation;
          </li>
          <li>
            access the App's servers or interfaces by any means other than the App itself,
            including scripted or automated access;
          </li>
          <li>
            interfere with, overload, or attempt to disrupt the App or the infrastructure
            that supports it, or circumvent any rate limit, usage cap, or security measure;
          </li>
          <li>
            extract, reuse, or attempt to extract credentials, tokens, keys, or prompts
            from the App;
          </li>
          <li>
            misrepresent the App's output as medical advice, or as endorsed by any health
            professional or organization; or
          </li>
          <li>
            use the App in any setting where a wrong result could contribute to injury,
            including in clinical or institutional food service.
          </li>
        </ul>
        <p>
          We may limit, suspend, or terminate your access at any time if we reasonably
          believe you have breached these Terms or are placing the service or other users at
          risk.
        </p>
      </Section>

      <Section title="9. Fees">
        <p>
          The App is currently provided free of charge. We may introduce paid features in
          future. If we do, the price, billing period, and renewal terms will be disclosed
          to you before you purchase, and any purchase will be processed by Apple under
          Apple's terms — not by us.
        </p>
        <p>
          <strong>We cannot issue refunds for App Store purchases.</strong> Refund requests
          for anything bought through the App Store are handled by Apple under its policies.
          You would manage and cancel any subscription through your Apple account settings.
        </p>
      </Section>

      <Section title="10. Privacy">
        <p>
          Our <a href="/privacy">Privacy Policy</a> describes how we handle information. In
          short: the App works without an account, menu photographs are not retained after
          analysis, and we do not sell personal information. Colorado residents have rights
          under the Colorado Privacy Act, and residents of other states may have comparable
          rights; the Privacy Policy explains how to exercise them.
        </p>
      </Section>

      <Section title="11. Third Parties, Restaurants, and Links">
        <p>
          The App relies on third-party service providers, including artificial intelligence
          providers, hosting providers, and analytics and crash-reporting providers. They
          are identified in our <a href="/privacy">Privacy Policy</a>. We are not
          responsible for their acts or omissions beyond our own obligations to you.
        </p>
        <p>
          <strong>We have no relationship with the restaurants whose menus you photograph.</strong>{" "}
          We do not endorse them, we are not affiliated with them, they do not review or
          approve anything the App says, and we are not responsible for the food they serve,
          the accuracy of their menus, or how they prepare a dish.
        </p>
      </Section>

      <Section title="12. Our Intellectual Property">
        <p>
          The App, its design, its content, its scoring methodology, and the Eat Out Better
          name and logo are owned by Dine Right or its licensors and are protected by
          intellectual property law. Except for the licence in Section 7, nothing in these
          Terms transfers any right in them to you.
        </p>
      </Section>

      <Section title="13. Disclaimer of Warranties">
        <p style={styles.legal}>
          THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE," WITH ALL FAULTS AND WITHOUT
          WARRANTY OF ANY KIND. TO THE FULLEST EXTENT PERMITTED BY LAW, DINE RIGHT LLC
          DISCLAIMS ALL WARRANTIES, EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING ANY
          IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE,
          AND NON-INFRINGEMENT.
        </p>
        <p style={styles.legal}>
          WITHOUT LIMITING THE FOREGOING, WE DO NOT WARRANT THAT THE APP'S SCORES,
          EXPLANATIONS, SUBSTITUTIONS, OR ANY OTHER OUTPUT WILL BE ACCURATE, COMPLETE,
          RELIABLE, CURRENT, CONSISTENT, OR SUITABLE FOR YOUR HEALTH NEEDS; THAT THE APP
          WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE; OR THAT ANY DEFECT WILL BE
          CORRECTED.
        </p>
        <p style={styles.legal}>
          NO ADVICE OR INFORMATION, WHETHER ORAL OR WRITTEN, OBTAINED FROM US OR THROUGH THE
          APP CREATES ANY WARRANTY NOT EXPRESSLY STATED HERE.
        </p>
        <p>
          Some jurisdictions do not allow the exclusion of certain warranties, so some of
          the above may not apply to you. In that case such warranties are limited to the
          minimum duration and scope permitted by law.
        </p>
      </Section>

      <Section title="14. Limitation of Liability">
        <p style={styles.legal}>
          TO THE FULLEST EXTENT PERMITTED BY LAW, DINE RIGHT LLC AND ITS MEMBERS, MANAGERS,
          OFFICERS, EMPLOYEES, CONTRACTORS, AGENTS, SUPPLIERS, AND LICENSORS (TOGETHER, THE
          "<strong>PROTECTED PARTIES</strong>") WILL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY
          LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING OUT OF
          OR RELATING TO THESE TERMS OR YOUR USE OF THE APP, WHETHER BASED ON CONTRACT,
          TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER THEORY, AND EVEN IF A
          PROTECTED PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p style={styles.legal}>
          TO THE FULLEST EXTENT PERMITTED BY LAW, THE TOTAL AGGREGATE LIABILITY OF THE
          PROTECTED PARTIES FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE
          APP WILL NOT EXCEED THE GREATER OF (A) THE TOTAL AMOUNT YOU PAID US FOR THE APP IN
          THE TWELVE MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED
          U.S. DOLLARS ($100).
        </p>
        <p style={styles.legal}>
          THESE LIMITATIONS APPLY EVEN IF A LIMITED REMEDY FAILS OF ITS ESSENTIAL PURPOSE,
          AND THEY ARE A FUNDAMENTAL BASIS OF THE BARGAIN BETWEEN US. THE APP IS PROVIDED TO
          YOU AT NO CHARGE, AND WE WOULD NOT PROVIDE IT WITHOUT THESE LIMITATIONS.
        </p>
        <p>
          <strong>What these limits do not cover.</strong> Nothing in these Terms excludes
          or limits liability that cannot lawfully be excluded or limited, including
          liability for fraud, for fraudulent misrepresentation, for willful and wanton
          conduct, or for death or personal injury to the extent applicable law prohibits
          such a limitation. Nothing in these Terms waives or limits any right or remedy
          available to you under the Colorado Consumer Protection Act, Colo. Rev. Stat.
          § 6-1-101 et seq., or any other consumer protection statute that may not be
          waived by contract. Some jurisdictions do not allow certain limitations, so parts
          of this section may not apply to you.
        </p>
      </Section>

      <Section title="15. No Personal Liability of Owners or Personnel">
        <p>
          Dine Right LLC is a Colorado limited liability company. Consistent with Colo. Rev.
          Stat. § 7-80-705, its members and managers are not personally liable for the
          debts, obligations, or liabilities of the company.
        </p>
        <p>
          You agree that any claim you may have arising out of or relating to the App or
          these Terms may be brought <strong>only against Dine Right LLC</strong>, and not
          against any of its members, managers, officers, employees, contractors, or agents
          personally. This section does not limit any liability that cannot lawfully be
          limited, including liability for a person's own fraud or willful and wanton
          conduct.
        </p>
      </Section>

      <Section title="16. Indemnification">
        <p>
          To the fullest extent permitted by law, you will indemnify, defend, and hold
          harmless the Protected Parties from and against any claim, demand, proceeding,
          loss, liability, damage, cost, or expense (including reasonable attorneys' fees)
          arising out of or relating to:
        </p>
        <ul>
          <li>your use or misuse of the App;</li>
          <li>
            Your Content, including any claim that a photograph you submitted infringed
            someone's intellectual property or privacy rights;
          </li>
          <li>your breach of these Terms or of any applicable law; or</li>
          <li>
            your reliance on the App's output in a manner these Terms tell you not to,
            including reliance for allergen or medical purposes.
          </li>
        </ul>
        <p>
          We may assume the exclusive defense and control of any matter subject to
          indemnification by you, at your expense, and you agree to cooperate with our
          defense.
        </p>
      </Section>

      <Section title="17. Time Limit for Bringing a Claim">
        <p>
          To the fullest extent permitted by law, any claim arising out of or relating to
          these Terms or the App must be filed within{" "}
          <strong>one (1) year</strong> after the claim arose. Otherwise it is permanently
          barred. Where applicable law does not permit a period this short, the shortest
          period that law does permit applies instead.
        </p>
      </Section>

      <Section title="18. Dispute Resolution, Arbitration, and Class Action Waiver">
        <p style={styles.legal}>
          PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR
          RIGHT TO FILE A LAWSUIT IN COURT AND TO HAVE A JURY DECIDE YOUR CLAIMS.
        </p>

        <h3 style={styles.subheading}>Talk to us first</h3>
        <p>
          Most problems can be resolved quickly. Before starting an arbitration or a
          lawsuit, you agree to email us at{" "}
          <a href="mailto:support@eatoutbetter.com">support@eatoutbetter.com</a> with a
          short description of the dispute and the relief you want, and to give us{" "}
          <strong>60 days</strong> to try to resolve it. We agree to do the same before
          bringing a claim against you.
        </p>

        <h3 style={styles.subheading}>Agreement to arbitrate</h3>
        <p>
          If we cannot resolve it, you and Dine Right agree that any dispute arising out of
          or relating to these Terms or the App will be resolved by{" "}
          <strong>binding individual arbitration</strong> administered by the American
          Arbitration Association under its Consumer Arbitration Rules, rather than in
          court. The Federal Arbitration Act governs the interpretation and enforcement of
          this section. The arbitration will take place in Colorado, or by telephone or
          video conference, or — at your election — in the county where you live.
        </p>

        <h3 style={styles.subheading}>Class action and jury waiver</h3>
        <p style={styles.legal}>
          YOU AND DINE RIGHT AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN AN
          INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS,
          COLLECTIVE, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING. YOU AND DINE RIGHT WAIVE
          ANY RIGHT TO A JURY TRIAL. If a court decides that this class waiver is
          unenforceable as to a particular claim, that claim — and only that claim — will
          proceed in court, and the rest of this section will remain in force.
        </p>

        <h3 style={styles.subheading}>Exceptions</h3>
        <p>
          Either of us may bring an individual claim in small claims court, and either of us
          may seek injunctive relief in court to protect intellectual property rights.
        </p>

        <h3 style={styles.subheading}>Your right to opt out</h3>
        <p>
          <strong>You can decline this arbitration agreement.</strong> Email{" "}
          <a href="mailto:support@eatoutbetter.com">support@eatoutbetter.com</a> with the
          subject line "Arbitration Opt-Out" within <strong>30 days</strong> of first
          accepting these Terms, including the email address or device you use with the App.
          Opting out affects nothing else in these Terms, and it will not affect your use of
          the App in any way.
        </p>
      </Section>

      <Section title="19. Governing Law and Venue">
        <p>
          These Terms and any dispute arising out of them are governed by the laws of the{" "}
          <strong>State of Colorado</strong>, without regard to its conflict of laws rules,
          and by applicable federal law. For any dispute not subject to arbitration, you and
          Dine Right consent to the exclusive jurisdiction and venue of the state and
          federal courts located in Colorado.
        </p>
        <p>
          If you live somewhere whose law gives you consumer protections that cannot be
          overridden by a choice-of-law clause, those protections still apply to you.
        </p>
      </Section>

      <Section title="20. Apple-Specific Terms">
        <p>
          This section applies to the App obtained through Apple's App Store, and it
          controls over anything inconsistent elsewhere in these Terms.
        </p>
        <ul>
          <li>
            <strong>These Terms are between you and Dine Right only, not Apple.</strong>{" "}
            Apple is not responsible for the App or its content.
          </li>
          <li>
            <strong>Scope of licence.</strong> The licence in Section 7 is limited to a
            non-transferable licence to use the App on an Apple-branded product that you own
            or control, as permitted by the Usage Rules in Apple's Media Services Terms and
            Conditions.
          </li>
          <li>
            <strong>Maintenance and support.</strong> Dine Right is solely responsible for
            providing any maintenance and support for the App.{" "}
            <strong>Apple has no obligation to furnish any maintenance or support.</strong>
          </li>
          <li>
            <strong>Warranty.</strong> Dine Right is solely responsible for any product
            warranties, whether express or implied by law, to the extent not effectively
            disclaimed. If the App fails to conform to any applicable warranty, you may
            notify Apple, and Apple will refund the purchase price of the App to you (the
            App is currently free, so that amount is zero). To the maximum extent permitted
            by law, <strong>Apple has no other warranty obligation whatsoever</strong> with
            respect to the App.
          </li>
          <li>
            <strong>Product claims.</strong> Dine Right, not Apple, is responsible for
            addressing any claim by you or a third party relating to the App or your
            possession and use of it, including product liability claims, any claim that the
            App fails to conform to a legal or regulatory requirement, and claims arising
            under consumer protection, privacy, or similar legislation.
          </li>
          <li>
            <strong>Intellectual property claims.</strong> If a third party claims the App
            infringes its intellectual property rights, Dine Right — not Apple — is solely
            responsible for the investigation, defense, settlement, and discharge of that
            claim.
          </li>
          <li>
            <strong>Legal compliance.</strong> You represent that you are not located in a
            country subject to a U.S. Government embargo or designated as a "terrorist
            supporting" country, and that you are not on any U.S. Government list of
            prohibited or restricted parties.
          </li>
          <li>
            <strong>Third-party terms.</strong> You must comply with any applicable
            third-party terms when using the App.
          </li>
          <li>
            <strong>Third-party beneficiary.</strong> Apple and its subsidiaries are
            third-party beneficiaries of these Terms, and upon your acceptance{" "}
            <strong>Apple has the right to enforce these Terms against you</strong> as a
            third-party beneficiary.
          </li>
          <li>
            <strong>Contact.</strong> Questions, complaints, and claims about the App should
            be directed to the address in Section 24.
          </li>
        </ul>
      </Section>

      <Section title="21. Changes to These Terms">
        <p>
          We may update these Terms as the App changes. When we do, we will revise the
          Effective Date and version number above. If a change is material, we will ask you
          to accept the updated Terms in the App before you continue using it.
        </p>
        <p>
          Continuing to use the App after an update takes effect means you accept it. If you
          do not accept, stop using the App and delete it.
        </p>
      </Section>

      <Section title="22. Termination">
        <p>
          You may end this agreement at any time by deleting the App. We may suspend or
          terminate your access at any time, with or without notice, if we reasonably believe
          you have breached these Terms, or if we discontinue the App.
        </p>
        <p>
          Sections 3 through 6 and 11 through 19, and any other provision that by its nature
          should survive, will survive termination.
        </p>
      </Section>

      <Section title="23. General">
        <ul>
          <li>
            <strong>Entire agreement.</strong> These Terms and the Privacy Policy are the
            entire agreement between you and Dine Right about the App, and replace any prior
            understanding.
          </li>
          <li>
            <strong>Severability.</strong> If any provision is held unenforceable, it will be
            modified to the minimum extent necessary to make it enforceable, or severed if it
            cannot be, and the rest remains in full force.
          </li>
          <li>
            <strong>No waiver.</strong> Our failure to enforce a provision is not a waiver of
            it.
          </li>
          <li>
            <strong>Assignment.</strong> You may not assign these Terms without our written
            consent. We may assign them in connection with a merger, acquisition, or sale of
            assets.
          </li>
          <li>
            <strong>Notices.</strong> We may give you notice through the App or by email. You
            may give us notice at the address in Section 24.
          </li>
          <li>
            <strong>Force majeure.</strong> Neither party is liable for a failure to perform
            caused by events beyond its reasonable control.
          </li>
          <li>
            <strong>No third-party beneficiaries</strong>, except as stated in Section 20 for
            Apple and in Sections 14 through 16 for the Protected Parties.
          </li>
        </ul>
      </Section>

      <Section title="24. Contact Us">
        <p>
          <strong>Dine Right LLC</strong>
          <br />
          Email: <a href="mailto:support@eatoutbetter.com">support@eatoutbetter.com</a>
        </p>
        <p>
          For privacy questions and requests, see our{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </Section>

      <footer style={styles.footer}>
        <p style={styles.footerText}>
          Eat Out Better is operated by Dine Right LLC, a Colorado limited liability company.
          Version {VERSION}, effective {EFFECTIVE_DATE}.
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
    marginBottom: 4,
  },
  meta: {
    color: "#666",
    fontSize: 14,
    margin: "2px 0",
  },
  callout: {
    marginTop: 28,
    padding: "16px 18px",
    background: "#f4f7f5",
    border: "1px solid #cfded5",
    borderLeft: "4px solid #1B4332",
    borderRadius: 4,
  },
  calloutText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.65,
  },
  warning: {
    margin: "14px 0",
    padding: "16px 18px",
    background: "#fdf3f2",
    border: "1px solid #e6bdb9",
    borderLeft: "4px solid #9c2b26",
    borderRadius: 4,
  },
  warningText: {
    margin: "0 0 10px",
    fontSize: 15,
    lineHeight: 1.65,
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
    marginTop: 18,
    marginBottom: 4,
  },
  // Conspicuous under UCC § 2-316: set apart from the surrounding prose so a
  // reader cannot miss it. Caps alone is not enough if it reads as body text.
  legal: {
    fontSize: 14.5,
    lineHeight: 1.65,
    letterSpacing: 0.1,
    background: "#fafafa",
    borderLeft: "3px solid #999",
    padding: "12px 14px",
    margin: "12px 0",
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
