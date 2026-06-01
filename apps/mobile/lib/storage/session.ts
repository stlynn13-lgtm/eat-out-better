/**
 * Session storage — AsyncStorage implementation
 *
 * Same interface as the web localStorage version in apps/api.
 * V1 swap point: replace AsyncStorage calls with Supabase queries.
 * The interface (saveSession, getSessions, etc.) stays identical.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MenuSession } from "@eat-out-better/shared";

const STORAGE_KEY = "eat-out-better:sessions";
const MAX_SESSIONS = 10;

export async function saveSession(session: MenuSession): Promise<void> {
  try {
    const existing = await getSessions();
    const updated = [session, ...existing].slice(0, MAX_SESSIONS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    // Non-fatal — session history is convenience, not critical
    console.warn("Failed to save session:", error);
  }
}

export async function getSessions(): Promise<MenuSession[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getLastSession(): Promise<MenuSession | null> {
  const sessions = await getSessions();
  return sessions[0] ?? null;
}

export async function clearSessions(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
