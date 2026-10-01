import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Whether this install has answered the first-launch account offer
 * (app/welcome.tsx). Recorded when the offer is ANSWERED — account created, or
 * "Continue without an account" — not when it is shown, so an app killed
 * halfway through the offer gets it again rather than never.
 */
const SEEN_KEY = "eat-out-better:welcome-account-seen:v1";

export async function hasAnsweredWelcome(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SEEN_KEY)) !== null;
  } catch {
    // Can't tell — then don't risk showing it on every launch.
    return true;
  }
}

export async function recordWelcomeAnswered(): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY, new Date().toISOString());
  } catch (error) {
    console.warn("[welcome] Could not record the answer:", error);
  }
}
