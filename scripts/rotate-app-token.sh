#!/usr/bin/env bash
#
# Rotates APP_TOKEN — the shared secret the app sends to /api/analyze as the
# `x-app-token` header — WITHOUT the value ever being printed.
#
# WHY THAT MATTERS HERE
#
# The token this replaces was burned by being pasted into a chat transcript
# during setup. A rotation that displays the new value on a terminal, in a
# scrollback buffer, or in an assistant's context recreates exactly that
# failure. So this script generates the secret, pipes it straight into EAS, and
# lets it fall out of scope. It is never echoed, never written to a file, and
# never placed in your shell history.
#
# It also moves the variable from "secret" to "sensitive" visibility. Secret
# variables can only be read on an EAS builder, which is why `eas update` cannot
# resolve one and silently publishes an update with no token at all. Sensitive
# variables are masked in the UI but can be injected locally by
# `eas env:exec`, which is what makes routine over-the-air updates possible.
#
# ONE HONEST LIMITATION
#
# `eas env:create` takes the value as a command-line flag and offers no way to
# read it from stdin, so the token is briefly visible to anything reading the
# process list on this machine during the call. It is not written to shell
# history (this is a script, and there is no `set -x`). On a personal machine
# that is an acceptable trade; on a shared or CI host it is not.
#
# USAGE
#   ./scripts/rotate-app-token.sh            # rotate, print next steps
#   ./scripts/rotate-app-token.sh --clipboard  # also copy to clipboard (macOS)
#
# The --clipboard flag exists for one reason: you must paste the same value into
# Vercel as APP_SHARED_TOKEN when you eventually switch the gate on. Copying it
# straight to the clipboard means it goes from generator to browser without ever
# appearing on screen. Clear the clipboard afterwards.

set -euo pipefail

MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../apps/mobile" && pwd)"
COPY_TO_CLIPBOARD=false
[[ "${1:-}" == "--clipboard" ]] && COPY_TO_CLIPBOARD=true

echo "==> Rotating APP_TOKEN"
echo

# --- Generate ---------------------------------------------------------------
# 32 bytes of hex. Never echoed.
NEW_TOKEN="$(openssl rand -hex 32)"
echo "    Generated a new 32-byte token (not shown)."

# --- Store in EAS -----------------------------------------------------------
# Delete first, then create. EAS treats secrecy as a one-way door: overwriting a
# secret variable with a sensitive one is refused outright —
#
#   "You cannot change a secret variable to a non-secret variable."
#
# and --force does not help, because the restriction is about the target
# visibility rather than the overwrite. Deleting and recreating is the only
# supported route.
#
# The variable therefore does not exist for a second or two. A build started in
# that window would fail on the EAS builder, loudly, via the APP_TOKEN guard in
# app.config.ts — which is the correct outcome, not a silent bad artifact. Do
# not run this while a build is queued.
#
# Both environments get the same value: preview and production builds talk to
# the same API, so a split would mean the gate could only ever be right for one.
cd "$MOBILE_DIR"
for ENVIRONMENT in production preview; do
  echo "    Replacing APP_TOKEN in EAS environment: $ENVIRONMENT"

  # Tolerate absence — on a re-run, or if a previous attempt half-completed,
  # there may be nothing to delete.
  npx --yes eas-cli env:delete "$ENVIRONMENT" \
    --variable-name APP_TOKEN \
    --non-interactive >/dev/null 2>&1 || true

  npx --yes eas-cli env:create "$ENVIRONMENT" \
    --name APP_TOKEN \
    --value "$NEW_TOKEN" \
    --visibility sensitive \
    --type string \
    --scope project \
    --force \
    --non-interactive >/dev/null
done
echo "    Stored with sensitive visibility."

# --- Optional clipboard -----------------------------------------------------
if $COPY_TO_CLIPBOARD; then
  if command -v pbcopy >/dev/null 2>&1; then
    printf '%s' "$NEW_TOKEN" | pbcopy
    echo "    Copied to clipboard for pasting into Vercel. Clear it when done."
  else
    echo "    pbcopy not found — skipping clipboard."
  fi
fi

unset NEW_TOKEN

cat <<'STEPS'

==> Done. What happens next, in this order.

  The order matters. Switching on the API gate before devices carry the new
  token 401s every install, including any that never update.

  1. Ship the new token to existing devices, over the air:

       cd apps/mobile
       npx eas-cli env:exec --environment production -- npm run update:production

     `extra.appToken` travels in the update manifest, so build 9 devices pick
     up the new token on their next cold start. No build required.

  2. Cut a build so NEW installs carry it too:

       cd apps/mobile
       EAS_SKIP_AUTO_FINGERPRINT=1 npx eas-cli build --platform ios \
         --profile production --auto-submit

  3. ONLY THEN, and only once adoption is high, set the same value in Vercel as
     APP_SHARED_TOKEN. Until you do, the API stays fail-open and both the old
     and new tokens work — so there is no breakage window while steps 1 and 2
     propagate. That is deliberate.

     If you did not use --clipboard and no longer have the value, run this
     script again: rotating twice is harmless while the gate is off.

  4. Confirm the gate is live by sending a request with no token. It should
     return 401 rather than 400:

       curl -s -o /dev/null -w '%{http_code}\n' \
         -X POST https://eat-out-better-api.vercel.app/api/analyze \
         -H 'Content-Type: application/json' -d '{}'

STEPS
