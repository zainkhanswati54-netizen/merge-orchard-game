#!/usr/bin/env bash
# Copies the pre-generated app icons (android-assets/app-icon/) into a
# freshly-generated Capacitor android/ project. Shared by setup-android.sh
# (local builds) and .github/workflows/build-android.yml (CI builds) so
# both always install icons exactly the same way.
set -e

echo "Installing app icons into android/..."

for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  src="android-assets/app-icon/mipmap-${density}"
  dest="android/app/src/main/res/mipmap-${density}"
  if [ -d "$src" ]; then
    mkdir -p "$dest"
    cp -r "$src"/* "$dest"/
  fi
done

mkdir -p android/app/src/main/res/mipmap-anydpi-v26
cp android-assets/app-icon/mipmap-anydpi-v26/*.xml android/app/src/main/res/mipmap-anydpi-v26/

if [ -f android/app/src/main/res/values/colors.xml ]; then
  if grep -q "ic_launcher_background" android/app/src/main/res/values/colors.xml; then
    echo "colors.xml already defines ic_launcher_background — leaving it as-is."
  else
    echo "NOTE: android/app/src/main/res/values/colors.xml already exists and"
    echo "      doesn't define ic_launcher_background. Add this line inside it:"
    echo '      <color name="ic_launcher_background">#1B1530</color>'
  fi
else
  mkdir -p android/app/src/main/res/values
  cp android-assets/app-icon/values/colors.xml android/app/src/main/res/values/colors.xml
fi

echo "Icons installed."
