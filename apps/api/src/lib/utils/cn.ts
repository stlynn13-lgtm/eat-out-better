/**
 * Simple className merger. Avoids the clsx/tailwind-merge dependency for V0.
 * Upgrade to clsx + tailwind-merge if class conflicts become an issue.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
