/**
 * Recognising a request that iOS killed while the app was backgrounded.
 *
 * When the app is suspended mid-request, iOS tears down the socket. The moment
 * the app returns to the foreground, React Native's fetch rejects with
 * `TypeError: Network request failed`. That rejection is not a real network
 * problem: the phone is online, the request was just interrupted, and
 * re-issuing it straight away succeeds.
 *
 * The message alone isn't enough to go on. React Native uses that same string
 * for every transport failure, including being genuinely offline, so treating
 * every match as a suspension would spend the generous suspension retry
 * budget hammering a dead connection. It only counts when the app actually
 * left the foreground during the attempt.
 */

/** React Native's fetch rejects with exactly this for any transport failure. */
export const RN_NETWORK_FAILURE_MESSAGE = "Network request failed";

export function isNetworkRequestFailed(error: unknown): boolean {
  return error instanceof Error && error.message === RN_NETWORK_FAILURE_MESSAGE;
}

/**
 * True when a fetch rejection is the casualty of an iOS suspension rather than
 * a genuine network failure, so it should be retried silently.
 *
 * @param backgroundedDuringAttempt the app went to the background at some
 *   point while this attempt was in flight
 * @param appActive the app is in the foreground right now (AppState "active");
 *   false covers the case where the rejection lands before the "background"
 *   event has reached JS
 */
export function isSuspendedRequestError(
  error: unknown,
  backgroundedDuringAttempt: boolean,
  appActive: boolean
): boolean {
  return isNetworkRequestFailed(error) && (backgroundedDuringAttempt || !appActive);
}
