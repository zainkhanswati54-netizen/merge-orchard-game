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
js/audio.js              real Web Audio playback (drop/merge/game-over), with per-tier pitch shifting on merges
js/physics.js            thin Matter.js wrapper (walls, bodies, collisions)
js/particles.js          merge explosion particle bursts
js/screenshake.js        decaying camera-shake effect
js/input.js              keyboard + mouse + touch + on-screen button input
js/ui.js                 score/high-score DOM updates, game-over modal
js/game.js               the actual game loop: merging, danger timer, rendering
js/main.js               boots everything, sizes the canvas
assets/sounds/           the three real sound files (drop, merge, game-over)
manifest.json           PWA manifest (Android "Add to Home Screen")
sw.js                    tiny offline cache (optional, safe to ignore)
icons/icon.svg           app icon used by the manifest
capacitor.config.json   Capacitor config for the native Android build (set your appId before building)
setup-android.sh         one-shot script that wires Capacitor + icons into android/
android-assets/          pre-generated app icons (all densities, adaptive) + Play Store listing graphics
ANDROID_BUILD_GUIDE.md  full walkthrough: Capacitor → signed APK/AAB → Play Console checklist
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
  on-screen ◀ / DROP / ▶ buttons (68px+ tall hit targets, generously padded for thumbs).

The entire page locks out browser-native touch gestures (`touch-action: none`,
`overscroll-behavior: none`) so dragging to aim never accidentally triggers
Chrome's swipe-to-go-back or pull-to-refresh, and pinch/double-tap-zoom can't
throw off the canvas size mid-game.

## Audio

Real sound is wired up and playing — `js/audio.js` loads three short, original,
royalty-free files from `assets/sounds/` (`drop.ogg`, `merge.ogg`, `gameover.ogg`)
through the Web Audio API.

The merge sound uses one trick worth knowing about: it's a single base file
whose *playback rate* is shifted per tier, rather than five separate
recordings. Lower-tier merges play it back faster/higher (light, crisp);
the max-tier merge plays it back slower/lower (deep, impactful). That curve
lives in `playMergeSound()` in `js/audio.js` if you want to retune it.

Browsers require a real user gesture before audio can play, so loading
starts on the player's very first tap/click/keypress (see `onFirstInteraction`
in `js/input.js`) — by the time they actually drop something, the files have
almost always already finished loading.

Want to swap in your own sounds instead? Just replace the three files in
`assets/sounds/` with same-named files (any format `<audio>`/Web Audio
supports — mp3, wav, ogg) and update the paths in `SOUND_FILES` at the top
of `js/audio.js` if you rename them.

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
inside this chat, so you'll do this step on your own machine. Full walkthrough — including
pre-generated app icons, adaptive icon layers, Play Store listing graphics, signing, and a
one-shot setup script — is in **`ANDROID_BUILD_GUIDE.md`**.

## Tuning the feel

Almost everything worth tweaking lives in `js/config.js`: drop cooldown, danger-line
position and grace period, screen-shake strength, gravity/bounciness, and the pop-tween
duration. Fruit colors, sizes, and scores live in `js/items.js`.
