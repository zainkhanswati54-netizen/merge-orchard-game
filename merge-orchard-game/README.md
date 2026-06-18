# Merge Orchard

A tight, single-mechanic physics merging game (Suika/Watermelon-style): aim, drop fruit,
merge matching tiers, avoid topping out the jar. Built as plain HTML5 + JS modules +
Matter.js for physics — no build step required.

## Project structure

```
index.html            page shell, HUD markup, loads Matter.js + js/main.js
css/style.css          all visual styling (HUD, buttons, modal, danger line)
js/config.js            every tunable number (sizes, speeds, timers) in one place
js/items.js              the 5 fruit tiers (radius, color, score value)
js/utils.js              math + easing helpers (incl. the merge "pop" curve)
js/audio.js              playDropSound / playMergeSound / playGameOverSound hooks
js/physics.js            thin Matter.js wrapper (walls, bodies, collisions)
js/particles.js          merge explosion particle bursts
js/screenshake.js        decaying camera-shake effect
js/input.js              keyboard + mouse + touch + on-screen button input
js/ui.js                 score/high-score DOM updates, game-over modal
js/game.js               the actual game loop: merging, danger timer, rendering
js/main.js               boots everything, sizes the canvas
manifest.json           PWA manifest (Android "Add to Home Screen")
sw.js                    tiny offline cache (optional, safe to ignore)
icons/icon.svg           app icon used by the manifest
```

Why this many files and not one giant script: each one owns exactly one job
(physics, particles, shake, audio, UI, input), so the merge loop itself — the only
mechanic this game has — stays easy to tune without wading through unrelated code.

## Running it locally

Because the JS uses ES modules (`import`/`export`), opening `index.html` directly
with `file://` will fail in most browsers (CORS). Serve it over local HTTP instead:

```bash
# from inside the project folder
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static file server works (`npx serve`, VS Code's "Live Server" extension, etc.).

## Controls

- **Desktop:** mouse to aim, click (or Space/Enter) to drop. Arrow keys / A,D also move the dropper.
- **Touch / Android:** drag a finger across the jar to aim, tap to drop — or use the
  on-screen ◀ / DROP / ▶ buttons, sized for thumbs.

## Adding real sound

`js/audio.js` currently just `console.log`s when a sound *should* play. Drop your
files into `assets/sounds/` and replace each function body, e.g.:

```js
const dropClip = new Audio('assets/sounds/drop.mp3');
export function playDropSound() {
  dropClip.currentTime = 0;
  dropClip.play().catch(() => {});
}
```

## Publishing to itch.io (web)

1. Zip the **contents** of this folder (index.html should be at the zip's root, not nested in a subfolder).
2. On itch.io: New Project → Kind of project: **HTML** → upload the zip.
3. Check **"This file will be played in the browser"** next to index.html.
4. Set viewport to a fixed size like 420 × 700 (or "automatically scale") — the game
   itself is responsive and will fit either.
5. Publish. No build step, no server-side code, nothing else required.

## Getting this onto Android

You've got two paths depending on how "real app" you need it to be:

**1. Instant path — installable web app (no Play Store, no native build):**
Open the page in Chrome on an Android phone → menu → **"Add to shortcut" / "Install app."**
The `manifest.json` + `sw.js` already in this project make it launch full-screen with
its own icon, just like a native app. This is the fastest way to get it on a phone today.

**2. Native APK path — for the Play Store:**
This needs a native build environment (Android Studio + Android SDK) that isn't available
inside this chat, so you'll do this step on your own machine:

```bash
npm install -g @capacitor/cli
npm init -y
npm install @capacitor/core @capacitor/android
npx cap init "Merge Orchard" "com.yourname.mergeorchard" --web-dir .
npx cap add android
npx cap copy android
npx cap open android   # opens Android Studio — build → generate signed APK/AAB
```

Because this game has no build tooling of its own (it's plain HTML/CSS/JS), the
`--web-dir .` points Capacitor straight at this folder — no bundler needed.

## Tuning the feel

Almost everything worth tweaking lives in `js/config.js`: drop cooldown, danger-line
position and grace period, screen-shake strength, gravity/bounciness, and the pop-tween
duration. Fruit colors, sizes, and scores live in `js/items.js`.
