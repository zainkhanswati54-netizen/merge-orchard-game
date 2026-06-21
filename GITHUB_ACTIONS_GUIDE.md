# Building the APK automatically with GitHub Actions

This is the fully-automated path: push this folder to GitHub, and a robot
builds your APK for you — no Android Studio, no manual Capacitor commands,
no chance of a copy-paste mistake. The workflow file is already included:
`.github/workflows/build-android.yml`.

## What it does

Every time you push to `main` (or trigger it manually), GitHub spins up a
fresh Ubuntu machine and:

1. Installs Node.js, Java 17, and the Android SDK
2. Installs Capacitor and generates the native `android/` project
3. Copies the game's web files into it and drops in the pre-made app icons
4. Builds a debug APK
5. Uploads that APK as a downloadable file attached to the run

That last part is the only thing you do by hand: **download the file**.
Everything before it is automatic.

## 1. Set your app ID first

Before your first push, open `capacitor.config.json` and change:

```json
"appId": "com.mergeorchard.app"
```

to something only you own, like `com.yourname.mergeorchard`. This is the
one thing that can't be changed later if you ever publish to the Play
Store, so it's worth doing now rather than after your first build.

## 2. Push this to a GitHub repository

If you don't already have one:

```bash
cd merge-orchard-game        # the folder you unzipped
git init
git add .
git commit -m "Initial commit"
```

Then create a new (empty) repository on github.com, and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## 3. Watch it build

Go to your repository on GitHub → the **Actions** tab. You'll see "Build
Android APK" running automatically (it started the moment you pushed). A
debug build typically takes 3–6 minutes the first time, faster on repeat
runs thanks to caching.

If it's not running for some reason, you can always start it by hand:
**Actions tab → Build Android APK → Run workflow**.

## 4. Download the APK

Once the run finishes (green checkmark), click into it, scroll to the
**Artifacts** section at the bottom, and download
**merge-orchard-debug-apk**. That's a `.zip` containing `app-debug.apk` —
unzip it and you have a real, installable Android app.

To install it on a phone: copy the APK over (email, USB, cloud drive,
whatever's easiest), tap it on the device, and allow "install from this
source" if Android prompts for it. This is a debug build, so it's perfect
for testing on your own device or sharing with friends for feedback — but
see the signed release section below before publishing anywhere.

## 5. (Optional) Get a signed release build too

A **debug** APK works great for testing but isn't meant for real
distribution — Android treats it differently, and the Play Store won't
accept it at all. To also get a properly **signed release APK** from the
same automated pipeline, give the workflow a signing key via repository
secrets. Once these four secrets exist, a second job
(`build-signed-release`) automatically activates on your very next push —
no workflow file changes needed.

**Generate a keystore** (one-time, on your own machine — this is the key
that proves every future update really comes from you, so keep the file
and password safe forever):

```bash
keytool -genkey -v -keystore release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias merge-orchard
```

**Base64-encode it**, so it can safely live as a text secret:

```bash
base64 -i release.jks | tr -d '\n' > release.jks.base64.txt
# Windows PowerShell instead:
# [Convert]::ToBase64String([IO.File]::ReadAllBytes("release.jks")) | Out-File release.jks.base64.txt
```

**Add four repository secrets** — GitHub repo → Settings → Secrets and
variables → Actions → New repository secret:

| Secret name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the full contents of `release.jks.base64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | the password you set when generating the keystore |
| `ANDROID_KEY_ALIAS` | `merge-orchard` (or whatever `-alias` you used above) |
| `ANDROID_KEY_PASSWORD` | usually the same as the keystore password, unless you set a separate one |

Push again (even a trivial commit), and you'll see a second artifact,
**merge-orchard-release-apk**, appear alongside the debug one. That's the
file to actually distribute or upload to Play Console.

## Updating the game later

Just edit the files under `js/`, `css/`, `index.html`, etc. as normal and
push — the workflow rebuilds the APK(s) from scratch every time
automatically. Nothing about the Android side needs manual updating unless
you're changing the app icon or app ID.

## Troubleshooting

- **Red ❌ on the Actions run** — click into it, then into the failed step,
  to see the exact error. The most common cause is a typo introduced while
  editing game files (the build will tell you which file and line).
- **"appId" warning or Play Store rejects an upload** — you forgot step 1;
  the default placeholder `com.mergeorchard.app` is shared across everyone
  who uses this guide, so it can't be unique to your account.
- **Signed release job doesn't appear** — double check all four secret
  *names* match exactly (case-sensitive) and that you pushed a new commit
  after adding them; the condition is checked fresh on every run.
