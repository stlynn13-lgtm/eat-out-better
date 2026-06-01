export interface HealthCondition {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  active: boolean; // false = stubbed for V1, not shown in UI
}

export const HEALTH_CONDITIONS: HealthCondition[] = [
  {
    id: "high_cholesterol",
    label: "High Cholesterol",
    shortLabel: "Heart Health",
    description: "Avoid saturated fats, trans fats, and high-sodium dishes.",
    active: true,
  },
  {
    id: "gluten_free",
    label: "Gluten-Free",
    shortLabel: "Gluten-Free",
    description: "Avoid wheat, barley, rye, and cross-contamination risk.",
    active: false, // V1
  },
  {
    id: "diabetes",
    label: "Type 2 Diabetes",
    shortLabel: "Blood Sugar",
    description: "Minimize refined carbs, added sugars, and high-GI foods.",
    active: false, // V1
  },
];

export const DEFAULT_CONDITION = "high_cholesterol";

export function getCondition(id: string): HealthCondition | undefined {
  return HEALTH_CONDITIONS.find((c) => c.id === id);
}

export function getActiveConditions(): HealthCondition[] {
  return HEALTH_CONDITIONS.filter((c) => c.active);
}
