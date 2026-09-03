#!/usr/bin/env bash
# Orbit iOS release: production build → TestFlight submit
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Production iOS build (EAS)..."
npx eas-cli build --platform ios --profile production "$@"

echo ""
echo "→ When the build finishes, submit to TestFlight:"
echo "  npx eas-cli submit --platform ios --profile production --latest"
echo ""
echo "→ Then follow docs/APP_STORE_RELEASE.md and docs/APP_REVIEW_NOTES.md"
