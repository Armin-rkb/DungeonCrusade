#!/usr/bin/env bash
# Generates (if missing) and patches the Capacitor native projects.
#
#   platforms/mobile/setup.sh            # android + ios
#   platforms/mobile/setup.sh android    # just one
#
# Steps per platform (all idempotent, safe to re-run):
#   1. npx cap add <platform>      only when ./<platform> does not exist yet
#   2. patch-native.mjs <platform> landscape, deep links, controllers, version
#   3. npx cap sync <platform>     copy dist/ + native plugin wiring
#
# Needs `npm ci` and a web build in dist/ (`npm run build`) first.
# Env: DC_PUBLIC_HOST / VITE_PUBLIC_URL (App Link host), DC_BUILD_NUMBER.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

platforms=("$@")
if [ ${#platforms[@]} -eq 0 ]; then platforms=(android ios); fi

if [ ! -f dist/index.html ]; then
  echo "setup.sh: dist/index.html not found - run 'npm run build' first." >&2
  exit 1
fi
if [ ! -x node_modules/.bin/cap ]; then
  echo "setup.sh: @capacitor/cli is not installed - run 'npm ci' first." >&2
  exit 1
fi

for platform in "${platforms[@]}"; do
  case "$platform" in
    android | ios) ;;
    *)
      echo "setup.sh: unknown platform '$platform' (expected android or ios)" >&2
      exit 2
      ;;
  esac

  if [ -d "$platform" ]; then
    echo "==> $platform/ already exists, keeping it"
  else
    echo "==> npx cap add $platform"
    npx cap add "$platform"
  fi

  echo "==> patching $platform"
  node platforms/mobile/patch-native.mjs "$platform"

  echo "==> npx cap sync $platform"
  npx cap sync "$platform"
done

echo "==> done. Open with: npx cap open android | npx cap open ios"
