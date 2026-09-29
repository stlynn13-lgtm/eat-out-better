#!/usr/bin/env bash
#
# One-time setup: connects this repo to the Supabase project and configures
# everything on the Supabase side of accounts and the $200/day spend cap.
#
#   ./scripts/setup-supabase.sh
#
# Run it from the repo root, in your own Terminal, after the "only you can do
# this" steps in ACCOUNTS-SETUP.md. It asks for six values. Secrets are typed
# with input hidden, go straight to the Supabase and EAS command-line tools, and
# are never written to disk, printed, or committed.
#
# What it does, in order:
#   1. Logs the Supabase CLI in (opens your browser) if it isn't already.
#   2. Links this repo to your project.
#   3. Creates the database tables (supabase/migrations/): saved scans, and the
#      spend-cap counters.
#   4. Pushes every auth setting from supabase/config.toml: anonymous accounts,
#      login linking, the 6-digit code emails, sending through Resend,
#      Sign in with Apple, Google, the app's return URL, rate limits.
#   5. Stores the two public values the app build needs in EAS.
#
# Safe to run again: every step is idempotent.

set -euo pipefail
cd "$(dirname "$0")/.."

SUPABASE="npx --yes supabase@2.118.0"
EAS="npx --yes eas-cli"

say() { printf "\n\033[1;32m==>\033[0m %s\n" "$1"; }

say "Checking the Supabase CLI is logged in"
if ! $SUPABASE projects list >/dev/null 2>&1; then
  echo "A browser window will open — approve it, then come back here."
  $SUPABASE login
fi

echo
echo "Six values. Anything secret is hidden as you type (paste works)."
echo
read -rp  "1/6  Project ref — the 20 letters in your project's dashboard URL: " PROJECT_REF
read -rsp "2/6  Database password (set when you created the project): " SUPABASE_DB_PASSWORD; echo
read -rp  "3/6  Publishable key (starts sb_publishable_): " SUPABASE_PUBLISHABLE_KEY
read -rsp "4/6  Resend API key (starts re_): " RESEND_API_KEY; echo
read -rp  "5/6  Google OAuth client ID (ends .apps.googleusercontent.com): " GOOGLE_CLIENT_ID
read -rsp "6/6  Google OAuth client secret: " GOOGLE_CLIENT_SECRET; echo

if [[ ! "$PROJECT_REF" =~ ^[a-z]{20}$ ]]; then
  echo "That project ref doesn't look right — it's exactly 20 lowercase letters." >&2
  exit 1
fi
if [[ "$SUPABASE_PUBLISHABLE_KEY" != sb_publishable_* ]]; then
  echo "That isn't a publishable key (it should start sb_publishable_). Never paste the secret key here." >&2
  exit 1
fi

export SUPABASE_DB_PASSWORD RESEND_API_KEY GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET

say "Linking this repo to project $PROJECT_REF"
$SUPABASE link --project-ref "$PROJECT_REF"

say "Creating the database tables"
$SUPABASE db push --linked

say "Pushing auth settings (anonymous accounts, email codes, Apple, Google, Resend)"
$SUPABASE config push --project-ref "$PROJECT_REF" --yes

say "Saving the app's public Supabase values in EAS (production + preview)"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
(
  cd apps/mobile
  for NAME in SUPABASE_URL SUPABASE_PUBLISHABLE_KEY; do
    $EAS env:create --name "$NAME" --value "${!NAME}" \
      --environment production --environment preview \
      --visibility plaintext --force --non-interactive
  done
)

unset SUPABASE_DB_PASSWORD RESEND_API_KEY GOOGLE_CLIENT_SECRET

say "Supabase is set up."
cat <<EOF

Last step (ACCOUNTS-SETUP.md step 4): in Vercel → eat-out-better-api →
Settings → Environment Variables, add

  SUPABASE_URL          $SUPABASE_URL
  SUPABASE_SECRET_KEY   (Supabase → Project Settings → API Keys → secret key)
  APPLE_TEAM_ID, APPLE_SIGN_IN_KEY_ID, APPLE_SIGN_IN_PRIVATE_KEY

then Redeploy. That switches on account deletion and the \$200/day spend cap.
Tell Claude when it's done — the app side is switched on with an update, no new build.
EOF
