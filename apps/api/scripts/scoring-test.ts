/**
 * scoreFromEstimates — the curve that turns the model's gram estimates into a
 * score (config/scoring.ts). Pure, no API key.
 *
 *   npm run test:scoring
 */

import { scoreFromEstimates, getTier, type DishEstimates } from "../src/lib/config/scoring";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `   (${detail})`}`);
}
const est = (satFatG: number, addedSugarG = 0, protective: DishEstimates["protective"] = "none", fried = false) =>
  ({ satFatG, addedSugarG, protective, fried });
const s = (e: DishEstimates, cat = "main") => scoreFromEstimates(e, cat);

console.log("\nTier edges land where the curve says:");
check("no saturated fat → 10", s(est(0)) === 10, String(s(est(0))));
check("5g is green, 5.5g is yellow (score rounds to 1 decimal)", getTier(s(est(5))) === "green" && getTier(s(est(5.5))) === "yellow", `${s(est(5))} / ${s(est(5.5))}`);
check("11g is yellow, 11.5g is red", getTier(s(est(11))) === "yellow" && getTier(s(est(11.5))) === "red", `${s(est(11))} / ${s(est(11.5))}`);
check("huge portions bottom out at 1.0", s(est(80)) === 1, String(s(est(80))));
check("a negative estimate is treated as zero", s(est(-3)) === 10);

console.log("\nProtective credit:");
check("grilled salmon (5g, strong) lands near 8.5", s(est(5, 0, "strong")) === 8.5, String(s(est(5, 0, "strong"))));
check("credit never exceeds 10", s(est(0, 0, "strong")) === 10);

console.log("\nFrying:");
check("frying costs a point", s(est(8, 0, "none", true)) === Number((s(est(8)) - 1).toFixed(1)), `${s(est(8, 0, "none", true))} vs ${s(est(8))}`);
check("fried 10g fish & chips is red (unfried, yellow)", getTier(s(est(10, 0, "none", true))) === "red" && getTier(s(est(10))) === "yellow", String(s(est(10, 0, "none", true))));

console.log("\nSugar counts for drinks and desserts only:");
check("a 40g-sugar main is still judged on fat", s(est(2, 40), "main") === s(est(2), "main"));
check("a 40g-sugar drink is red", getTier(s(est(0, 40), "drink_non_alcoholic")) === "red", String(s(est(0, 40), "drink_non_alcoholic")));
check("15g of added sugar is the red edge", getTier(s(est(0, 15), "dessert")) === "yellow" && getTier(s(est(0, 15.5), "dessert")) === "red");
check("the worse factor decides", s(est(15, 2), "dessert") === s(est(15), "main"));
check("unsweetened tea stays green", getTier(s(est(0, 0), "drink_non_alcoholic")) === "green");

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
