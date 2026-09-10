/**
 * Legal document URLs, and the record of the user accepting them.
 *
 * Why acceptance is stored at all: a disclaimer nobody agreed to is much weaker
 * than one they tapped through. Courts routinely enforce "clickwrap" (an
 * affirmative "I Agree" against visible links) and routinely refuse to enforce
 * "browsewrap" (terms sitting behind a footer link the user never opened). The
 * whole point of TermsGate is to be the former, and this module is the record
 * that it happened.
 *
 * Versioned on purpose. Storing the version accepted — rather than a bare
 * boolean — means a future material change to the Terms can re-prompt only the
 * people who accepted the older text, which is what section 21 of the Terms
 * promises we will do.
 *
 * The URLs are derived from the same `apiUrl` the analysis calls use, so a
 * pointer at a preview deployment stays internally consistent instead of
 * sending users to production legal text for a different build.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const FALLBACK_BASE = "https://eat-out-better-api.vercel.app";

function baseUrl(): string {
  const configured = Constants.expoConfig?.extra?.apiUrl;
  return typeof configured === "string" && configured.length > 0
    ? configured.replace(/\/+$/, "")
    : FALLBACK_BASE;
}

export const TERMS_URL = `${baseUrl()}/terms`;
export const PRIVACY_URL = `${baseUrl()}/privacy`;

/**
 * Must match the `VERSION` constant in apps/api/src/app/terms/page.tsx.
 * Bump BOTH when the Terms change materially — that is what re-prompts
 * everyone who accepted the previous version.
 */
export const TERMS_VERSION = "1.0";

const STORAGE_KEY = "legal_acceptance_v1";

export type LegalAcceptance = {
  /** The Terms version the user tapped "I Agree" on. */
  version: string;
  /** ISO 8601, device clock. Evidence of when, not a trusted timestamp. */
  acceptedAt: string;
  /** App version at the time, for support triage. */
  appVersion: string;
};

/** The acceptance on record, or null if there is none. */
export async function getAcceptance(): Promise<LegalAcceptance | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LegalAcceptance>;
    if (typeof parsed?.version !== "string") return null;
    return {
      version: parsed.version,
      acceptedAt: typeof parsed.acceptedAt === "string" ? parsed.acceptedAt : "",
      appVersion: typeof parsed.appVersion === "string" ? parsed.appVersion : "",
    };
  } catch {
    // Unreadable storage is treated as "never accepted". Re-prompting someone
    // who already agreed is a mild annoyance; skipping the prompt for someone
    // who never did defeats the point of having it.
    return null;
  }
}

/** True when the user has accepted the version of the Terms now in force. */
export async function hasAcceptedCurrentTerms(): Promise<boolean> {
  const acceptance = await getAcceptance();
  return acceptance?.version === TERMS_VERSION;
}

/** Records acceptance of the current Terms. Returns false if the write failed. */
export async function recordAcceptance(): Promise<boolean> {
  const record: LegalAcceptance = {
    version: TERMS_VERSION,
    acceptedAt: new Date().toISOString(),
    appVersion:
      typeof Constants.expoConfig?.version === "string"
        ? Constants.expoConfig.version
        : "",
  };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
