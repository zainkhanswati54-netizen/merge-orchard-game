# 📱 Install Game as App (PWA Method) — No APK Build Needed!

This is simpler and more reliable than building an APK with Android Studio.

## On Your Laptop (one-time setup before each session):

```powershell
cd C:\Users\zaink\Downloads\legend-orchard-v5\legend-orchard-v5
Copy-Item "node_modules\matter-js\build\matter.js" "www\matter.min.js" -Force
cd www
npx http-server -p 8080
```

Note the IP address shown, e.g. `http://192.168.1.3:8080`

## On Your Phone:

1. Connect phone to the **SAME WiFi** as your laptop
2. Open **Chrome** browser
3. Type the laptop's IP address (e.g. `http://192.168.1.3:8080`)
4. Wait for the game to fully load (you'll hear/see it work)
5. Tap the **⋮ (3 dots) menu** in Chrome → **"Add to Home screen"**
6. Tap **Add**

## Result:

- An app icon appears on your home screen
- Tapping it opens the game **fullscreen, no browser bars** — looks exactly like a native app
- After the first successful load (while connected), the Service Worker caches 
  everything, so **the game will work without internet** afterward
- This is called a PWA (Progressive Web App) — used by major apps like 
  Twitter Lite, Starbucks, Pinterest

## Why this is better than the APK right now:

- No Android Studio / Gradle errors
- No JDK configuration issues  
- Works immediately
- Same offline capability once cached
- Can revisit Android Studio APK building later when you have more time

## To make this permanent (laptop doesn't need to stay on):

Upload the `www` folder contents to any free static hosting:
- Netlify.com (drag and drop the www folder)
- Vercel.com
- GitHub Pages

Then anyone can visit that URL and "Add to Home Screen" — no laptop needed at all.
