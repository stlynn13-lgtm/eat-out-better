/**
 * One canonical dish-name key, shared by the OCR and ranking steps.
 *
 * These two steps MUST agree. OCR used to dedupe on `name.toLowerCase().trim()`
 * while ranking matched on alphanumerics-only, so "Caesar Salad" and
 * "Caesar-Salad" survived OCR as two dishes but collapsed to one key in
 * ranking's subset guard — leaving one of them with no slot to be re-added
 * into, and it silently vanished from the results. EAT-9 promises the ranked
 * set equals the extracted set; that only holds if both sides key dishes the
 * same way.
 *
 * Note this strips punctuation but does not transliterate words: "Fish &
 * Chips" and "Fish and Chips" remain distinct. That is fine — what matters is
 * that both steps draw the line in the same place.
 */
export function normalizeDishName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
