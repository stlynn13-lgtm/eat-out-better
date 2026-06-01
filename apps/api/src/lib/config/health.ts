/**
 * Health condition registry.
 *
 * V0: Only 'high_cholesterol' is active.
 * V1: Additional conditions are added here as records
 *     and pulled from the health_conditions DB table.
 *
 * Design principle: health conditions are data, not code branches.
 * Adding a new condition should never require modifying
 * the ranking pipeline or UI components — only this registry
 * and a new system prompt in prompts.ts.
 */

import type { HealthCondition, HealthConditionId } from "@/lib/types";

export const HEALTH_CONDITIONS: Record<HealthConditionId, HealthCondition> = {
  high_cholesterol: {
    id: "high_cholesterol",
    name: "High Cholesterol",
    description:
      "Ranks dishes by their impact on LDL ('bad') cholesterol. Lower saturated fat, higher fiber and omega-3s score better.",
    active: true, // V0: only active condition
  },
  // V1: Activate these once prompts and knowledge base are ready
  gluten_free: {
    id: "gluten_free",
    name: "Gluten-Free",
    description:
      "Flags dishes containing wheat, barley, rye, or cross-contamination risk.",
    active: false,
  },
  diabetes: {
    id: "diabetes",
    name: "Diabetes",
    description:
      "Ranks dishes by glycemic impact — low carb, high fiber, and low sugar score better.",
    active: false,
  },
  hypertension: {
    id: "hypertension",
    name: "High Blood Pressure",
    description:
      "Flags high-sodium dishes and ranks by overall cardiovascular impact.",
    active: false,
  },
};

/** The only active condition in V0. */
export const DEFAULT_CONDITION: HealthConditionId = "high_cholesterol";

/** Returns only active conditions (for V1 condition picker UI). */
export function getActiveConditions(): HealthCondition[] {
  return Object.values(HEALTH_CONDITIONS).filter((c) => c.active);
}

export function getCondition(id: HealthConditionId): HealthCondition {
  const condition = HEALTH_CONDITIONS[id];
  if (!condition) {
    throw new Error(`Unknown health condition: ${id}`);
  }
  return condition;
}
