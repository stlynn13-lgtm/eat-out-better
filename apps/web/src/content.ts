// All landing page copy lives here so it is easy to swap while the draft
// is unconfirmed. Source: "Landing Page Brief" draft (2026-10-06), pending
// Sean's sign-off. Claims guardrails from that brief: no medical/accuracy
// claims, no testimonials or user counts, no credentials.

export const content = {
  cta: "Get early access",
  hero: {
    eyebrow: "Early access for iPhone",
    headline: "Order with confidence when you're watching your cholesterol.",
    subhead:
      "Take a photo of any restaurant menu. Eat Out Better rates each dish green, yellow or red for high cholesterol, tells you why, and suggests a swap that makes it better.",
  },
  form: {
    label: "Email address",
    help: "iPhone only for now. Use the email on your Apple ID so we can send your invite. No spam, unsubscribe any time.",
    error: "Enter a valid email address, like name@example.com.",
    success: "You're on the list. We'll email your invite when your spot opens.",
  },
  problem: {
    title: "You know the basics. The menu is the hard part.",
    body: "Go easy on fried food and heavy cream sauces. But you're at a table, the menu is two pages, and everyone's waiting. Eat Out Better does that read for you.",
  },
  steps: [
    { title: "Snap the menu", body: "Photograph it, up to 12 photos for long menus. No typing." },
    { title: "See every dish rated", body: "Green, yellow or red for cholesterol, ranked so the best options come first." },
    { title: "Swap and order", body: "Each dish says why it's rated that way and what to ask for instead." },
  ],
  features: [
    {
      title: "The whole menu, not just the salad section",
      body: "Every dish gets a rating, so you're comparing real options.",
    },
    {
      title: "The reason, not just a color",
      body: "\"Fried and cream-based, which is high in saturated fat.\" You see the driver and can disagree with it.",
    },
    {
      title: "A better way to order it",
      body: "\"Ask for it grilled, sauce on the side.\" A less-bad choice you can actually make beats a perfect one you won't.",
    },
  ],
  principles: [
    "No lectures. You decide what to eat. We just make it easier.",
    "Try it without an account.",
    "Built around one condition first, high cholesterol, so we get it right before we add more.",
  ],
  faq: [
    {
      q: "Is this medical advice?",
      a: "No. Eat Out Better gives general information and estimates based on typical recipes. It can't see how a specific kitchen prepares a dish. Talk to your doctor or dietitian about what's right for you.",
    },
    {
      q: "How accurate is it?",
      a: "It's an estimate, and we're upfront about that. Restaurants vary, so treat the rating as a well-informed starting point, and use the swap suggestions to ask your server.",
    },
    {
      q: "What conditions does it cover?",
      a: "High cholesterol today. We plan to add others, and we'll tell early-access members first.",
    },
    { q: "Is it available on Android?", a: "Not yet. iPhone first." },
    // TODO(copy): "What does it cost?" and "What happens to my menu photos?"
    // are open decisions in the brief. Add once pricing line and privacy
    // policy wording are confirmed.
  ],
  finalCta: { headline: "Next time the menu comes, you'll know what to order." },
  disclaimer:
    "Eat Out Better provides general information and estimates based on typical recipes. It isn't medical advice. Ask your doctor or dietitian about your own needs.",
  // Illustrative only. Replace with real captures from the app before launch.
  exampleResults: [
    { label: "Good fit", dish: "Grilled salmon, steamed greens", why: "Lean protein, no cream sauce.", tone: "bg-score-green" },
    { label: "Okay with a swap", dish: "Chicken parmesan", why: "Ask for it grilled instead of fried, sauce on the side.", tone: "bg-score-yellow" },
    { label: "Heavy hitter", dish: "Loaded bacon cheeseburger", why: "High saturated fat from cheese, bacon and the bun.", tone: "bg-score-red" },
  ],
} as const;
