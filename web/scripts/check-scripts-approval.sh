#!/usr/bin/env bash
set -euo pipefail

# npm v12 will block unapproved lifecycle scripts by default.
# This check ensures every package with install scripts is explicitly reviewed.
output="$(npx -y npm@11.16.0 approve-scripts --allow-scripts-pending 2>&1 || true)"

echo "$output"

if echo "$output" | grep -q "No packages with unreviewed install scripts."; then
  exit 0
fi

echo "ERROR: Found unreviewed install scripts. Approve trusted packages with 'npm approve-scripts <pkg>' and commit package.json." >&2
exit 1
