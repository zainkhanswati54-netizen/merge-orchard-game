# Legend of the Lost Orchard — Android APK Build

Yeh folder aapke game ko ek **real Android APK** banane ke liye ready hai.
GitHub Actions automatically build karega — aapko Android Studio install
karne ki zaroorat nahi.

---

## Kaise kaam karta hai (short mein)

- `www/` folder mein aapka poora game hai (HTML/CSS/JS) — same code jo
  browser mein chalta hai.
- `Capacitor` is game ko ek native Android app ke andar "wrap" kar deta hai.
- Matter.js (physics engine) ab CDN se nahi, balki **build ke time npm se
  install** hoke seedha app ke andar local file ke roop mein daal diya
  jaata hai — isliye APK **internet ke bina** bhi chalega.
- GitHub Actions (`.github/workflows/build-apk.yml`) automatically:
  1. npm install karta hai
  2. Matter.js ko app ke andar copy karta hai
  3. App icons/splash generate karta hai
  4. Android project banata hai
  5. APK build karta hai
  6. APK ko download karne ke liye ready rakhta hai

---

## STEP-BY-STEP (karna kya hai)

### 1. GitHub account banao (agar nahi hai)
https://github.com/signup par jaake free account banao.

### 2. Naya repository banao
- github.com par login karke top-right "+" → **New repository**
- Naam de do: `legend-orchard-android`
- **Public** ya **Private** dono chalega
- "Create repository" dabao
- **Koi README/gitignore add mat karo** — yeh humne already bana diya hai

### 3. Yeh folder GitHub par upload karo

Sabse aasan tareeka — apne computer par yeh commands chalao (terminal/
command prompt mein, is folder ke andar):

```bash
cd legend-orchard-android
git init
git add .
git commit -m "Initial Android APK setup"
git branch -M main
git remote add origin https://github.com/<aapka-username>/legend-orchard-android.git
git push -u origin main
```

(`<aapka-username>` ko apne GitHub username se replace kar do.)

**Agar `git` command line se comfortable nahi ho**, to GitHub Desktop app
use kar lo (https://desktop.github.com) — wahan bas "Add local repository"
karke yeh folder select karo aur "Publish" button dabao.

### 4. Build automatically shuru ho jaayega
- Apne GitHub repo ke page par jaake **"Actions"** tab kholo
- "Build Android APK" workflow chal rahi hogi (yellow dot = running,
  green tick = done, red cross = error)
- Build mein **5-10 minute** lag sakte hain (pehli baar zyada time lega)

### 5. APK download karo
- Jab build green tick ho jaaye, us workflow run par click karo
- Sabse neeche **"Artifacts"** section mein `legend-orchard-debug-apk`
  milega — usse download kar lo (yeh ek `.zip` hoga, andar APK hai)
- Zip ke andar `app-debug.apk` file ko apne Android phone par bhej do
  (USB, WhatsApp, Google Drive — koi bhi tareeka)
- Phone par tap karke install kar lo (pehli baar "Install from unknown
  sources" allow karna padega — yeh normal hai non-Play-Store apps ke liye)

---

## Agar build fail ho jaaye (red cross)

Actions tab mein us failed run par click karo, har step expand karke
red/error wali line dhundo. Common issues:

- **`gradlew: Permission denied`** — already handle kiya hai workflow
  mein (`chmod +x`), lekin agar phir bhi aaye, batana.
- **npm install fails** — internet/registry issue, dobara "Re-run jobs"
  try karo (Actions page ke top-right se).

---

## Baad mein game update karna ho to?

Bas `www/` folder ke andar apni files edit karo, phir:

```bash
git add .
git commit -m "Updated game"
git push
```

GitHub Actions automatically naya APK bana dega — har baar manually kuch
karne ki zaroorat nahi.

---

## Play Store par daalne ke liye (future, optional)

Abhi yeh **debug APK** hai — testing/sharing ke liye perfect hai, lekin
Google Play Store par daalne ke liye ek **signed release APK/AAB**
chahiye hota hai (keystore signing ke saath). Jab us stage par pahunch
jao, bata dena — woh ek alag, thoda lamba process hai (keystore banana,
signing config, Play Console account $25 one-time fee, etc.) aur main
woh bhi step-by-step set up kar dunga.
