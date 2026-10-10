/**
 * The sample menu used by the hero animation and the try-it demo.
 *
 * These are illustrative dishes, not a real restaurant, and the page labels
 * them that way. Scores follow the app's real method (saturated fat against a
 * ~13g daily budget, a lift for unsaturated fat and fiber, a small penalty for
 * deep-frying) and its real bands (7+ green, 4–6.9 amber, under 4 red), and
 * the copy mirrors the app's DishCard: a reason, then "Make it better" when
 * there is a swap. The scoring API returns no swaps yet, so no sample dish has
 * one; adding `swap` back to a dish brings the box back.
 */

export type Tier = "green" | "yellow" | "red";

export type SampleDish = {
  id: string;
  name: string;
  description: string;
  section: "Mains" | "Starters & Salads";
  score: number;
  reason: string;
  swap?: string;
  tag?: string;
};

export function tierOf(score: number): Tier {
  if (score >= 7) return "green";
  if (score >= 4) return "yellow";
  return "red";
}

export const TIER_LABEL: Record<Tier, string> = {
  green: "Top pick",
  yellow: "In moderation",
  red: "Enjoy occasionally",
};

export const SAMPLE_MENU: SampleDish[] = [
  {
    id: "salmon",
    name: "Cedar-Grilled Salmon",
    description: "Lemon, dill, charred broccolini, wild rice",
    section: "Mains",
    score: 8.7,
    tag: "Best Main",
    reason:
      "Salmon's fat is mostly the heart-healthy omega-3 kind, and grilling adds little. The broccolini and wild rice bring fiber.",
  },
  {
    id: "bean-burger",
    name: "Smoky Black Bean Burger",
    description: "Avocado, pickled onion, brioche bun, fries",
    section: "Mains",
    score: 7.2,
    reason:
      "Beans and avocado add fiber and unsaturated fat, which work in your favor. The brioche and fries pull it down a little.",
  },
  {
    id: "fajitas",
    name: "Chicken Fajitas",
    description: "Peppers, onions, flour tortillas, cheese, sour cream",
    section: "Mains",
    score: 5.8,
    reason:
      "The chicken and vegetables are a solid base. Most of the saturated fat comes from the cheese and sour cream on the side.",
  },
  {
    id: "caesar",
    name: "Grilled Chicken Caesar",
    description: "Romaine, parmesan, croutons, house Caesar dressing",
    section: "Starters & Salads",
    score: 4.6,
    reason:
      "Sounds light, but creamy Caesar dressing, parmesan and buttery croutons add up to more saturated fat than the chicken.",
  },
  {
    id: "fish-chips",
    name: "Beer-Battered Fish & Chips",
    description: "Cod, fries, tartar sauce",
    section: "Mains",
    score: 3.4,
    tag: "Enjoy Occasionally",
    reason:
      "The fish itself is lean, but deep-frying in batter and the fries add a lot of fat, and tartar sauce adds more.",
  },
  {
    id: "alfredo",
    name: "Fettuccine Alfredo",
    description: "Cream, butter, aged parmesan",
    section: "Mains",
    score: 1.8,
    tag: "Enjoy Occasionally",
    reason:
      "Cream, butter and parmesan make this likely more than a full day's saturated fat in one bowl.",
  },
];

/** Best to worst, the way the app shows them. */
export const RANKED = [...SAMPLE_MENU].sort((a, b) => b.score - a.score);
