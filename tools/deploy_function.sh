#!/bin/bash
# Step 94b: release DELA's server function from this Mac, with Supabase's own tool.
#
# Why: Supabase's hosted deploy can only read the function's code from a public address. This tool reads it from this
# folder instead, so the repository does not have to be public for a release.
#
# Use:   tools/deploy_function.sh <the full commit id to release>
# Needs: the Supabase tool logged in once on this Mac (Stacey: "npx -y supabase@3.1.0 login" in Terminal).
#        Its login is kept by the tool on this Mac. It is never written into this repository.
#
# It refuses to run unless this folder is exactly the commit named, the function's files are unchanged, and GitHub
# "Tests" passed for that commit.
set -e
cd "$(dirname "$0")/.."

SHA="$1"
PROJECT="ojshgsxgsypbywtqhkch"
TOOL="supabase@3.1.0"

case "$SHA" in
  ????????????????????????????????????????) ;;
  *) echo "Give the full commit id (40 characters)."; exit 2 ;;
esac

HEAD_NOW="$(git rev-parse HEAD)"
if [ "$HEAD_NOW" != "$SHA" ]; then echo "This folder is at $HEAD_NOW, not at $SHA. Check out that commit first."; exit 2; fi

CHANGED="$(git status --porcelain -- supabase/functions)"
if [ -n "$CHANGED" ]; then echo "The function's files differ from the commit:"; echo "$CHANGED"; exit 2; fi

TESTS="$(gh run list --workflow Tests --commit "$SHA" --json conclusion -q '.[0].conclusion')"
if [ "$TESTS" != "success" ]; then echo "GitHub Tests did not pass for $SHA (result: ${TESTS:-none yet})."; exit 2; fi

echo "Releasing the function api at $SHA to project $PROJECT ..."
npx -y "$TOOL" functions deploy api --remote="$PROJECT" --no-verify-jwt --use-api

echo "Health:"
curl -s -m 20 "https://$PROJECT.supabase.co/functions/v1/api/health"
echo
