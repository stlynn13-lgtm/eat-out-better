import { Redirect } from "expo-router";

/**
 * eat-out-better://auth/callback — where Google sign-in returns.
 *
 * On iOS the system sign-in sheet (ASWebAuthenticationSession) captures this
 * URL itself and hands it to lib/auth/account.ts, so the router never sees it.
 * This route exists only so that if the URL ever does reach the router (a
 * cold start from a stale link), the user lands on the home screen instead of
 * a "page not found".
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
