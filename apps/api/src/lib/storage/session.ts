/**
 * Session persistence layer.
 *
 * V0: localStorage (client-side only, no auth required)
 * V1: Swap the implementation here for Supabase calls.
 *     The interface stays the same — callers don't care about the backend.
 *
 * All functions are safe to call on the server (they return null/void there)
 * and during SSR (they guard against missing window).
 */

import type { MenuSession } from "@/lib/types";

const STORAGE_KEY = "eat-out-better:sessions";
const MAX_SESSIONS = 10; // Keep last 10 sessions in localStorage

// -----------------------------------------------------------
// Type guard
// -----------------------------------------------------------

function isMenuSession(value: unknown): value is MenuSession {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as MenuSession).id === "string" &&
    typeof (value as MenuSession).healthCondition === "string" &&
    Array.isArray((value as MenuSession).dishes)
  );
}

// -----------------------------------------------------------
// Storage helpers (localStorage)
// -----------------------------------------------------------

function isClient(): boolean {
  return typeof window !== "undefined";
}

function readSessions(): MenuSession[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMenuSession);
  } catch {
    return [];
  }
}

function writeSessions(sessions: MenuSession[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    // localStorage can throw if storage quota is exceeded
    console.warn("[Storage] Failed to write sessions:", error);
  }
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Saves a menu session. Maintains a FIFO queue of MAX_SESSIONS.
 * V1: Replace with Supabase INSERT.
 */
export function saveSession(session: MenuSession): void {
  const existing = readSessions();
  const updated = [session, ...existing].slice(0, MAX_SESSIONS);
  writeSessions(updated);
}

/**
 * Returns all saved sessions, newest first.
 * V1: Replace with Supabase SELECT.
 */
export function getSessions(): MenuSession[] {
  return readSessions();
}

/**
 * Returns the most recent session.
 * V1: Replace with Supabase SELECT WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1.
 */
export function getLastSession(): MenuSession | null {
  const sessions = readSessions();
  return sessions[0] ?? null;
}

/**
 * Returns a session by ID.
 * V1: Replace with Supabase SELECT WHERE id = $id.
 */
export function getSessionById(id: string): MenuSession | null {
  const sessions = readSessions();
  return sessions.find((s) => s.id === id) ?? null;
}

/**
 * Clears all saved sessions.
 * V1: Replace with Supabase DELETE WHERE user_id = auth.uid().
 */
export function clearSessions(): void {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEY);
}
