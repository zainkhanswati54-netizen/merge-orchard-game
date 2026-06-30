# 🚀 Build APK Automatically Using GitHub Actions

This builds your APK on GitHub's servers — no Gradle/JDK errors on your
laptop, no manual setup. GitHub does everything in the cloud.

---

## Step 1: Create a GitHub Account (if you don't have one)
Go to https://github.com and sign up — it's free.

---

## Step 2: Create a New Repository

1. Click the **+** icon top-right → **New repository**
2. Name it: `legend-orchard`
3. Set to **Public** (or Private if you have GitHub Pro)
4. Click **Create repository**

---

## Step 3: Upload Your Project

On the new repo page, click **"uploading an existing file"**

Drag and drop these from your `legend-orchard-v5` folder:
- `index.html`
- `css` folder
- `js` folder
- `assets` folder
- `icons` folder
- `www` folder
- `manifest.json`
- `sw.js`
- `capacitor.config.json`
- `package.json`
- `.github` folder (this contains the build instructions)

Click **Commit changes** at the bottom.

---

## Step 4: Watch It Build Automatically

1. Click the **Actions** tab at the top of your repository
2. You'll see **"Build Android APK"** running (yellow dot = in progress)
3. Wait **3-5 minutes** for it to finish (green checkmark = success)

---

## Step 5: Download Your APK

1. Click on the completed workflow run (green checkmark)
2. Scroll down to **Artifacts**
3. Click **legend-orchard-apk** to download a zip
4. Unzip it — inside is `app-debug.apk`
5. Send this APK to your phone and install it!

---

## If the Build Fails (red X):

1. Click on the failed run
2. Click on **build** job
3. Read the red error text
4. Send me a screenshot — I'll fix the workflow file instantly

---

## To Rebuild After Game Updates:

Just upload the new/changed files again (drag and drop), commit, and
GitHub Actions runs automatically again. You'll always get a fresh APK
in a few minutes — no PowerShell, no Android Studio, no Gradle errors.
