/**
 * Educational tips displayed on the Processing screen.
 * Rotate through these during the ~20s analysis wait.
 * All tips are factual, non-prescriptive, and reference
 * specific cholesterol factors per the PRD design principle.
 *
 * V0: 5 tips, one shown at a time (random selection).
 * V0.5: Could rotate through multiple tips if processing exceeds 20s.
 */

export interface ProcessingTip {
  id: string;
  headline: string;
  body: string;
}

export const PROCESSING_TIPS: ProcessingTip[] = [
  {
    id: "saturated-fat",
    headline: "Saturated fat matters more than you think",
    body: "Saturated fat raises LDL ('bad') cholesterol more than dietary cholesterol itself. Butter, cream, and fatty meats are the bigger culprits.",
  },
  {
    id: "cooking-method",
    headline: "How it's cooked changes everything",
    body: "The same protein grilled vs. fried can land very differently on your cholesterol. Preparation method is often the deciding factor.",
  },
  {
    id: "omega-3",
    headline: "Omega-3s work in your favor",
    body: "Fatty fish like salmon, mackerel, and sardines actively reduce triglycerides. Ordering fish isn't just safe — it can be beneficial.",
  },
  {
    id: "fiber",
    headline: "Fiber helps clear cholesterol",
    body: "Soluble fiber (beans, lentils, oats) binds to LDL cholesterol in your digestive system and removes it before it enters your bloodstream.",
  },
  {
    id: "substitutions",
    headline: "Small swaps make a real difference",
    body: "Asking for a sauce on the side, grilled instead of fried, or a salad instead of fries can drop the saturated fat content of a dish by 30–50%.",
  },
];

/**
 * Returns a deterministic tip index based on the current second,
 * so the tip doesn't flash-change on re-renders but rotates naturally.
 */
export function getCurrentTip(): ProcessingTip {
  const index = Math.floor(Date.now() / 1000) % PROCESSING_TIPS.length;
  return PROCESSING_TIPS[index];
}

/** Returns a random tip. */
export function getRandomTip(): ProcessingTip {
  const index = Math.floor(Math.random() * PROCESSING_TIPS.length);
  return PROCESSING_TIPS[index];
}
