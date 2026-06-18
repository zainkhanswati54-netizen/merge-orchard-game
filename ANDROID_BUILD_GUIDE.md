# Turning Merge Orchard into a Play Store-ready Android app

This path uses Capacitor to wrap the existing web game in a real native Android
project, so you get a proper signed `.aab`/`.apk`, a real app icon, and full
control in Android Studio. Everything here runs **on your own machine** —
Android Studio and the Android SDK can't run inside this chat.

## 0. Prerequisites (one-time install)

- **Node.js** (LTS) — [nodejs.org](https://nodejs.org)
- **Android Studio** — [developer.android.com/studio](https://developer.android.com/studio).
  During setup, let it install the Android SDK, an emulator image, and the JDK it bundles.
- A **Google Play Console developer account** ($25 one-time fee) — only needed when
  you're actually ready to publish, not for building/testing.

## 1. Wire up Capacitor

From inside this project folder (where `index.html` lives), run the included script:

```bash
chmod +x setup-android.sh
./setup-android.sh
```

This installs Capacitor, generates the native `android/` project, copies the
web game into it, and drops in the app icons I already generated for you
(`android-assets/`) — legacy icons at every density, a proper Android 8+
adaptive icon (foreground + background layers), and Play Store listing
assets (512×512 icon, 1024×500 feature graphic).

If you'd rather run the steps yourself instead of the script, they're listed
inside `setup-android.sh` — it's short and commented.

**Before you build anything**, open `capacitor.config.json` and change:

```json
"appId": "com.mergeorchard.app"
```

to something only you own, e.g. `com.yourname.mergeorchard`. This is the
package ID — Play Store enforces global uniqueness and **you cannot change it
after your first upload**, so pick it deliberately now.

## 2. Open it in Android Studio and test

```bash
npx cap open android
```

Android Studio opens the native project. Pick an emulator (or plug in a phone
with USB debugging enabled) and hit Run. The whole game — controls, physics,
merging, the danger line — runs exactly as it does in the browser, just
inside a native Android shell.

Whenever you change any game file (`js/`, `css/`, `index.html`), re-sync with:

```bash
npx cap copy android
```

## 3. Generate a signing key (one-time)

Play Store requires every release to be signed with a key only you hold:

```bash
keytool -genkey -v -keystore merge-orchard-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias merge-orchard
```

It'll ask for a password and some identity details — keep the `.jks` file and
password somewhere safe. **If you lose this key, you can never update your
app again under the same listing.**

## 4. Build a signed release (AAB for Play Store)

The easiest way: in Android Studio, **Build → Generate Signed Bundle / APK →
Android App Bundle**, point it at the `.jks` file from step 3, and follow the
wizard. This produces the `.aab` file Play Console wants.

Want a plain installable `.apk` too (for sideloading or testing outside the
store)? Same wizard, choose **APK** instead of **Android App Bundle**.

## 5. Before you hit "Publish" on Play Console

A checklist of what Play Console will ask for — most of it is already sitting
in `android-assets/play-store/`:

- App icon, 512×512 — `android-assets/play-store/icon-512.png` ✓ (already made)
- Feature graphic, 1024×500 — `android-assets/play-store/feature-graphic-1024x500.png` ✓ (already made)
- 2+ phone screenshots — grab these from your own test run in Android Studio or on a device
- Short description (≤80 characters) and full description (≤4000 characters)
- A privacy policy URL — required for every app now, even ones with no
  analytics/ads. A single static page stating you collect no personal data is
  enough if that's true; host it anywhere (GitHub Pages works fine).
- Content rating questionnaire (a short form inside Play Console itself)
- Data safety section (also inside Play Console — for this game, you can
  truthfully say no data is collected, since the high score is stored only
  locally on-device)

## Versioning future updates

Each new upload needs a higher `versionCode` (an integer, e.g. 1 → 2 → 3) in
`android/app/build.gradle`. `versionName` (e.g. "1.0", "1.1") is just the
human-readable label shown to players.

## Updating the game later

Edit the files under `js/`/`css/`/`index.html` as normal, then:

```bash
npx cap copy android
```

and rebuild the signed bundle (step 4) for the next Play Store release.
