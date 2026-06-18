#!/usr/bin/env bash
# Run this from inside the project folder (where index.html lives), on your
# own machine — it needs network access and Android Studio/SDK installed,
# neither of which exist in a sandboxed chat environment.
set -e

echo "== 1/4 Installing Capacitor =="
npm init -y > /dev/null 2>&1 || true
npm install @capacitor/core @capacitor/cli @capacitor/android

echo "== 2/4 Adding the Android platform =="
npx cap add android

echo "== 3/4 Copying the web app into the native project =="
npx cap copy android

echo "== 4/4 Dropping in the pre-generated app icons =="
cp -r android-assets/app-icon/mipmap-mdpi/*    android/app/src/main/res/mipmap-mdpi/    2>/dev/null || true
cp -r android-assets/app-icon/mipmap-hdpi/*    android/app/src/main/res/mipmap-hdpi/    2>/dev/null || true
cp -r android-assets/app-icon/mipmap-xhdpi/*   android/app/src/main/res/mipmap-xhdpi/   2>/dev/null || true
cp -r android-assets/app-icon/mipmap-xxhdpi/*  android/app/src/main/res/mipmap-xxhdpi/  2>/dev/null || true
cp -r android-assets/app-icon/mipmap-xxxhdpi/* android/app/src/main/res/mipmap-xxxhdpi/ 2>/dev/null || true
mkdir -p android/app/src/main/res/mipmap-anydpi-v26
cp android-assets/app-icon/mipmap-anydpi-v26/*.xml android/app/src/main/res/mipmap-anydpi-v26/

if [ -f android/app/src/main/res/values/colors.xml ]; then
  echo "NOTE: android/app/src/main/res/values/colors.xml already exists."
  echo "      Manually add this line inside it:"
  echo '      <color name="ic_launcher_background">#1B1530</color>'
else
  cp android-assets/app-icon/values/colors.xml android/app/src/main/res/values/colors.xml
fi

echo ""
echo "Done. Next: npx cap open android  (opens the project in Android Studio)"
