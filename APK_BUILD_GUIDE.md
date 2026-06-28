# 📱 APK Build Guide — Legend of the Lost Orchard

## Method: Capacitor (Best for HTML5 games → Android APK)

---

## Step 1: Install Node.js
Download from https://nodejs.org (LTS version)

---

## Step 2: Setup Project

Open terminal/command prompt in the game folder and run:

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Legend of the Lost Orchard" "com.legendorchard.game" --web-dir "."
```

---

## Step 3: capacitor.config.json (already created below)

File is already in your folder: `capacitor.config.json`

---

## Step 4: Add Android Platform

```bash
npx cap add android
npx cap sync android
```

---

## Step 5: Install Android Studio
Download from: https://developer.android.com/studio

---

## Step 6: Open in Android Studio

```bash
npx cap open android
```

In Android Studio:
- Wait for Gradle sync to finish
- Go to **Build → Build Bundle(s)/APK(s) → Build APK(s)**
- APK will be in: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Step 7: Sign APK for Release (Optional)
- Go to **Build → Generate Signed Bundle/APK**
- Create a keystore
- Build release APK

---

## 🎮 Game Settings for APK
The `capacitor.config.json` sets:
- Fullscreen mode
- Portrait orientation lock
- Splash screen with your logo
- Status bar hidden

---

## Quick Commands Summary
```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Legend of the Lost Orchard" "com.legendorchard.game" --web-dir "."
npx cap add android
npx cap sync android
npx cap open android
# Then in Android Studio: Build → Build APK
```
