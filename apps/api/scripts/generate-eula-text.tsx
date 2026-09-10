/**
 * Generates the plain-text EULA that gets pasted into App Store Connect.
 *
 * WHY THIS IS GENERATED AND NOT HAND-WRITTEN
 *
 * App Store Connect's Custom License Agreement field takes pasted TEXT, not a
 * URL. So the same legal document has to exist in two places: the hosted page
 * at /terms, and inside Apple's console.
 *
 * Two hand-maintained copies of a legal document is exactly how you end up with
 * an App Store EULA that says something different from your website — which is
 * worse than having no custom EULA at all, because now you have two contracts
 * and no way to say which one governs. This script removes that possibility by
 * rendering the SAME React component the web page uses and flattening it to
 * text. The two cannot disagree.
 *
 * Run it whenever terms/page.tsx changes:
 *
 *   npm --prefix apps/api run eula
 *
 * Then paste legal/eula-app-store.txt into App Store Connect.
 */

// Explicit React import: tsx compiles JSX with the classic runtime, which
// expects React.createElement to be in scope.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import TermsPage from "../src/app/terms/page";

/** Absolute base for links, since a pasted document has no site to be relative to. */
const SITE = "https://eat-out-better-api.vercel.app";

const OUT = resolve(__dirname, "../../../legal/eula-app-store.txt");

function htmlToText(html: string): string {
  let s = html;

  // Resolve links to something readable on paper: "text (https://...)".
  s = s.replace(
    /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
    (_m, href: string, label: string) => {
      const url = href.startsWith("/") ? SITE + href : href;
      if (url.startsWith("mailto:")) return label;
      return `${label} (${url})`;
    }
  );

  // Block boundaries become newlines before tags are stripped.
  s = s.replace(/<\/(h1|h2|h3|p|li|section|div|footer)>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "  - ");
  s = s.replace(/<br\s*\/?>/gi, "\n");

  // Headings get underlines so structure survives in a plain-text field.
  s = s.replace(/<h1[^>]*>(.*?)\n/gi, (_m, t: string) => `\n${t}\n${"=".repeat(60)}\n`);
  s = s.replace(/<h2[^>]*>(.*?)\n/gi, (_m, t: string) => `\n\n${t}\n${"-".repeat(60)}\n`);
  s = s.replace(/<h3[^>]*>(.*?)\n/gi, (_m, t: string) => `\n${t}\n`);

  s = s.replace(/<[^>]+>/g, "");

  // Entities React emitted while escaping.
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#x27;": "'",
    "&#39;": "'",
    "&nbsp;": " ",
    "&mdash;": "—",
  };
  s = s.replace(/&[a-zA-Z#0-9x]+;/g, (m) => entities[m] ?? m);

  // Collapse the whitespace JSX leaves behind, without eating paragraph breaks.
  s = s
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n");
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim() + "\n";
}

/** Wraps to a fixed column so the pasted text is readable in Apple's console. */
function wrap(text: string, width = 78): string {
  return text
    .split("\n")
    .map((line) => {
      if (line.length <= width) return line;
      const indent = line.startsWith("  - ") ? "    " : "";
      const words = line.split(" ");
      const out: string[] = [];
      let current = "";
      for (const word of words) {
        if (current && (current + " " + word).length > width) {
          out.push(current);
          current = indent + word;
        } else {
          current = current ? current + " " + word : word;
        }
      }
      if (current) out.push(current);
      return out.join("\n");
    })
    .join("\n");
}

const html = renderToStaticMarkup(<TermsPage />);
const text = wrap(htmlToText(html));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, text, "utf8");

const lines = text.split("\n").length;
console.log(`Wrote ${OUT}`);
console.log(`  ${text.length.toLocaleString()} characters, ${lines} lines`);
console.log(`\nPaste this into App Store Connect:`);
console.log(`  My Apps -> Eat Out Better -> App Information -> License Agreement`);
console.log(`  -> Edit -> Custom License Agreement`);
