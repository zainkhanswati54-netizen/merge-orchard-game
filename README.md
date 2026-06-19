# Merge Orchard

A tight, single-mechanic physics merging game (Suika/Watermelon-style): aim, drop fruit,
merge matching tiers, avoid topping out the jar. Built as plain HTML5 + JS modules +
Matter.js for physics — no build step required.

A full screen flow wraps the core loop: a real loading screen, a main menu,
a Settings overlay with working volume sliders, a local Leaderboard, glossy
hand-illustrated fruit (not flat circles), a juicy squish-on-merge animation,
and a proper Game Over modal that doesn't blank your score out from under you.

## Project structure

```
index.html               page shell — loading screen, main menu, game screen, all overlays
css/style.css             all visual styling (every screen, HUD, overlays, danger line)
js/config.js              every tunable number (sizes, speeds, timers) in one place
js/items.js               the 5 fruit tiers (radius, color, score value)
js/utils.js               math + easing helpers (incl. the merge pop/squish curves)
js/settings.js            SFX/music volume state, persisted + reactive (live slider updates)
js/leaderboard.js         local top-5 high scores, persisted to localStorage
js/fruitRenderer.js       hand-drawn glossy fruit illustrations (seeds, leaves, rind, gloss)
js/audio.js               Web Audio SFX + looping music bed, both wired to Settings volume
js/physics.js             thin Matter.js wrapper (walls, bodies, collisions)
js/particles.js           merge explosion particle bursts
js/screenshake.js         decaying camera-shake effect (scales with merge tier)
js/input.js               keyboard + mouse + touch + on-screen button input
js/ui.js                  in-game HUD updates, Game Over modal, live high-score saving
js/screens.js             loading sequence, menu nav, Settings/Leaderboard overlay wiring
js/game.js                the actual game loop: merging, danger timer, pause, rendering
js/main.js                boots everything, owns the Game instance, drives the loading screen
assets/sounds/            real sound files: drop, merge, game-over, and a looping music bed
manifest.json            PWA manifest (Android "Add to Home Screen")
sw.js                     tiny offline cache (optional, safe to ignore)
icons/icon.svg            app icon used by the manifest
capacitor.config.json    Capacitor config for the native Android build (set your appId before building)
setup-android.sh          one-shot script that wires Capacitor + icons into android/
android-assets/           pre-generated app icons (all densities, adaptive) + Play Store listing graphics
ANDROID_BUILD_GUIDE.md   full walkthrough: Capacitor → signed APK/AAB → Play Console checklist
```

Why this many files and not one giant script: each one owns exactly one job
(physics, particles, shake, audio, settings, leaderboard, screen flow, fruit
art), so any one concern — say, retuning the squish effect or adding a new
menu option — stays a small, isolated change instead of a hunt through
unrelated code.

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

## Screen flow

`js/screens.js` + `js/main.js` own navigation between four states:

1. **Loading screen** — a real progress bar driven by actual steps (waiting
   for fonts, decoding the audio files), not a fake timer, with a small
   minimum-display floor (`CONFIG.MIN_LOADING_SCREEN_MS`) so it still reads
   as a loading screen even on a fast connection.
2. **Main menu** — Play / Settings / Leaderboard.
3. **Game screen** — created lazily on the first "Play" press (no point
   ticking physics behind the menu). Pressing Play again just restarts the
   same instance in place.
4. **Settings** and **Leaderboard** are overlays, not separate screens —
   they can open on top of the menu *or* on top of the game (via the ⚙ icon
   in the in-game HUD), and opening Settings mid-game calls `game.pause()`
   so physics/timers genuinely freeze rather than continuing invisibly
   behind the overlay.

## Fruit art & juice

`js/fruitRenderer.js` draws each tier as actual illustrated fruit — seeds on
the strawberry, rind stripes on the watermelon, a two-tone gradient on the
apple, leafy crowns and stems — rather than a flat gradient circle, using
layered canvas gradients for a glossy highlight on every fruit.

The merge "juice" is two effects stacked together (see `squishPopScale` in
`js/utils.js`): the fruit scales up from 0 → 1.2 → 1.0 as before, *plus* a
brief non-uniform squash (wide and short) in the first fraction of that
tween that springs back to round — what actually reads as "juicy" rather
than just "appearing." Screen shake also scales with the merging tier, so a
cherry-merge is a light tap and a watermelon-merge properly shakes the
screen.

## Game Over behavior

The HUD score is **not** reset to 0 the instant a fruit overflows the danger
line for 2 seconds. The Game Over modal appears over the frozen board
showing `FINAL SCORE` and `PERSONAL BEST` (with a badge if you just beat
it), and only "Play Again" actually clears the board and zeroes the score.
The run is also recorded into the local Leaderboard (`js/leaderboard.js`,
top 5 scores) right when the modal appears.

## Audio

Real sound is wired up and playing — `js/audio.js` loads four short, original,
royalty-free files from `assets/sounds/`: three SFX (`drop.ogg`, `merge.ogg`,
`gameover.ogg`) through the Web Audio API, plus a seamlessly-looping ambient
music bed (`music_loop.ogg`) played through a standard `<audio>` element.

Both SFX and music volume are live-wired to the Settings overlay's sliders
via `js/settings.js` — dragging a slider updates `localStorage` immediately
and takes effect on the very next sound (SFX) or instantly (music, since its
`<audio>` element's `.volume` is updated the moment the slider moves).

The merge sound uses one trick worth knowing about: it's a single base file
whose *playback rate* is shifted per tier, rather than five separate
recordings. Lower-tier merges play it back faster/higher (light, crisp);
the max-tier merge plays it back slower/lower (deep, impactful). That curve
lives in `playMergeSound()` in `js/audio.js` if you want to retune it.

Browsers require a real user gesture before audio can play, so loading and
music start are both tied to the player's very first tap/click/keypress
anywhere in the game (see `onFirstInteraction` in `js/input.js`) — by the
time they actually drop something, the files have almost always already
finished loading.

Want to swap in your own sounds instead? Just replace the files in
`assets/sounds/` with same-named files (any format `<audio>`/Web Audio
supports — mp3, wav, ogg) and update the paths in `SOUND_FILES`/`MUSIC_FILE`
at the top of `js/audio.js` if you rename them.

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
position and timing (2 seconds by default), screen-shake strength, gravity/bounciness,
and the pop/squish tween duration. Fruit colors, sizes, and scores live in
`js/items.js`; the actual illustrations (seeds, stripes, leaves, gloss) live in
`js/fruitRenderer.js`. Default volume levels live in `js/settings.js`.
