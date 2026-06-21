#!/usr/bin/env bash
# Run this from inside the project folder (where index.html lives), on your
# own machine — it needs network access and Android Studio/SDK installed,
# neither of which exist in a sandboxed chat environment.
#
# This script does exactly what .github/workflows/build-android.yml does in
# CI, so a local build and a GitHub Actions build always match.
set -e

echo "== 1/4 Installing Capacitor (from package.json) =="
npm install

echo "== 2/4 Adding the Android platform =="
npx cap add android

echo "== 3/4 Copying the web app into the native project =="
npx cap copy android

echo "== 4/4 Dropping in the pre-generated app icons =="
chmod +x scripts/install-android-icons.sh
./scripts/install-android-icons.sh

echo ""
echo "Done. Next: npx cap open android  (opens the project in Android Studio)"
