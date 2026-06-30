# 📱 APK Build Guide — Legend of the Lost Orchard

## WHY APK LOOKS BLANK — AND HOW TO FIX
The blank screen happens because Capacitor needs the web files
copied INTO the Android project. These steps ensure everything works:

---

## Step 1: Install Prerequisites

1. **Node.js** — https://nodejs.org (LTS version, 18+)
2. **Android Studio** — https://developer.android.com/studio
   - During install, make sure to install: Android SDK, Android SDK Platform, Android Virtual Device
3. **Java JDK 17** — Usually bundled with Android Studio

---

## Step 2: Open Terminal in Game Folder

```bash
cd path/to/legend-orchard-v5
```

---

## Step 3: Install Dependencies

```bash
npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest
```

---

## Step 4: Initialize Capacitor (first time only)

```bash
npx cap init "Legend of the Lost Orchard" "com.legendorchard.game" --web-dir "."
```

---

## Step 5: Add Android Platform

```bash
npx cap add android
```

---

## CRITICAL STEP 6: Copy Web Files to Android

```bash
npx cap sync android
```

⚠️ This step copies ALL game files (HTML, CSS, JS, assets) into the
Android project. Without this, APK will be blank. Run this EVERY time
you update the game files.

---

## Step 7: Open in Android Studio

```bash
npx cap open android
```

---

## Step 8: Build APK in Android Studio

1. Wait for Gradle sync to complete (can take 2-5 minutes)
2. Go to: **Build → Build Bundle(s)/APK(s) → Build APK(s)**
3. Wait for build (1-3 minutes)
4. Click "locate" in the notification that appears
5. APK is at: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Step 9: Install on Phone

```bash
# If phone connected via USB with USB debugging ON:
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Or copy the APK file to your phone and install manually.

---

## For Bigger APK Size (include all assets properly):

In Android Studio, go to:
**File → Project Structure → app → Properties**
Make sure minSdk is 22+

Then in `android/app/build.gradle`, ensure:
```gradle
android {
    defaultConfig {
        minSdkVersion 22
        targetSdkVersion 33
    }
}
```

---

## Quick Commands (after first setup):

```bash
npx cap sync android    # Copy updated files
npx cap open android    # Open Android Studio
# Then Build → Build APK
```

---

## Expected APK Size: 15-25MB (all assets included after sync)

