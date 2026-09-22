#!/usr/bin/env bash
#
# Publishes an over-the-air update, with APP_TOKEN actually present.
#
# WHY THIS EXISTS
#
# `eas update` evaluates apps/mobile/app.config.ts on the machine you run it
# from, NOT on an EAS builder. eas.json's per-profile `env` blocks only apply
# to `eas build`, and `--environment production` on `eas update` does not reach
# the subprocess that evaluates the config. So a bare `eas update` resolves
# APP_TOKEN to `undefined` and publishes an update that strips the
# `x-app-token` header from every device that installs it — silently. Harmless
# only while the API's gate is fail-open; a field outage the day it is closed.
#
# `eas env:exec` is what puts the variable into that subprocess's environment.
# It works because rotate-app-token.sh moved APP_TOKEN from "secret" to
# "sensitive" visibility — secret variables are readable only on a builder,
# sensitive ones can be injected locally. That distinction is the whole reason
# routine OTA updates are possible at all.
#
# This used to be a thing you had to remember to type. Forgetting it did not
# fail loudly; it shipped a tokenless update. Now it is the only path.
#
# WHAT IT PRINTS BEFORE PUBLISHING, AND WHY YOU SHOULD READ IT
#
# The runtime version, resolved from the working tree. `eas update` bundles
# the WORKING TREE, not a commit or a branch — so whatever `version` is in
# app.config.ts right now decides which binaries can receive this update. Check
# out the commit you mean to publish BEFORE running this. Publishing from a
# tree whose version has moved on sends the update to a runtime nobody is
# running, and it looks like a success.
#
# USAGE
#   ./scripts/publish-update.sh production --message "what changed"
#   ./scripts/publish-update.sh preview
#
# Or, equivalently, from apps/mobile:
#   npm run update:production -- --message "what changed"
#
# Any extra arguments are passed through to `eas update` untouched.

set -euo pipefail

ENVIRONMENT="${1:-}"
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "preview" ]]; then
  echo "usage: $0 <production|preview> [extra eas update args...]" >&2
  exit 64
fi
shift

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/apps/mobile"

# Quote each pass-through argument so a --message with spaces survives being
# handed to env:exec as a single bash command string.
EXTRA=""
for arg in "$@"; do
  EXTRA="$EXTRA $(printf '%q' "$arg")"
done

# `runtimeVersion` is `{ policy: "appVersion" }`, so the runtime IS app.config.ts's
# `version` — read it from there, not from package.json, which is a separate
# string that can drift. Deliberately not `expo config`: that evaluates the whole
# config and colourises its output, and ANSI escapes landing between a key and its
# value is exactly how a present APP_TOKEN once read as empty.
RUNTIME="$(sed -nE 's/^[[:space:]]*version: "([^"]+)".*/\1/p' app.config.ts | head -1)"
if [[ -z "$RUNTIME" ]]; then
  echo "could not read 'version' from app.config.ts — refusing to publish blind" >&2
  exit 70
fi

# These two are kept in sync by hand, so a mismatch means one of them was missed.
PKG_VERSION="$(node -p "require('./package.json').version")"
if [[ "$RUNTIME" != "$PKG_VERSION" ]]; then
  echo "  WARNING: app.config.ts says $RUNTIME but package.json says $PKG_VERSION." >&2
  echo "           The runtime below comes from app.config.ts. Check which is wrong." >&2
fi

echo
echo "  branch / environment : $ENVIRONMENT"
echo "  runtime version      : $RUNTIME   <- only binaries built at this version receive it"
echo "  publishing from      : $(git rev-parse --short HEAD)$(git diff --quiet || echo ' + UNCOMMITTED CHANGES')"
echo

exec eas env:exec "$ENVIRONMENT" \
  "APP_ENV=$ENVIRONMENT eas update --branch $ENVIRONMENT --environment $ENVIRONMENT$EXTRA"
