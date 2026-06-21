# Merge Orchard

A tight, single-mechanic physics merging game (Suika/Watermelon-style): aim, drop fruit,
merge matching tiers, avoid topping out the jar. Built as plain HTML5 + JS modules +
Matter.js for physics — no build step required.

A full screen flow wraps the core loop: a real loading screen, a main menu with
floating background fruit, a Level Select screen for three unlockable orchards,
a Settings overlay with working volume sliders, a local Leaderboard, glossy
hand-illustrated fruit (13 unique fruits across 3 themes), an XP/leveling system,
combo chains with floating combat text, and an animated Game Over sequence with
a score tally and a confetti celebration on a new personal best. An 8-sound SFX
set plus an upbeat looping music track keep the whole thing feeling energetic,
and a GitHub Actions workflow builds a real Android APK automatically on every
push — see `GITHUB_ACTIONS_GUIDE.md`.

## Project structure

```
index.html               page shell — loading, menu, level select, game screen, all overlays
css/style.css             all visual styling (every screen, HUD, overlays, XP bar, danger line)
js/config.js              every tunable number (sizes, speeds, timers, combo/XP curve) in one place
js/themes.js              the 3 unlockable orchards: fruit tiers, unlock XP, difficulty modifiers
js/items.js               re-exports the classic theme's tiers (kept for backward compatibility)
js/xp.js                  lifetime XP + geometric level curve, persisted, reactive (live bar updates)
js/utils.js               math + easing helpers (pop/squish/landing-squash curves)
js/settings.js            SFX/music volume state, persisted + reactive (live slider updates)
js/leaderboard.js         local top-5 high scores, persisted to localStorage
js/fruitRenderer.js       13 hand-drawn glossy fruit illustrations, looked up by "kind" string
js/floatingText.js        combat-text popups (+score, combo callouts, SPLASH!/LEVEL UP!)
js/confetti.js            self-contained confetti burst for the new-high-score celebration
js/audio.js               Web Audio playback engine for SFX + looping music, wired to Settings volume
js/sfxLibrary.js          sound file paths + per-sound volume balancing (pure data, no playback logic)
js/physics.js             Matter.js wrapper — configurable jar width (narrower themes), wind force
js/particles.js           merge explosion particle bursts
js/screenshake.js         decaying camera-shake effect (scales with merge tier)
js/input.js               keyboard + mouse + touch + on-screen button input
js/ui.js                  in-game HUD, XP bar, animated Game Over tally + confetti hookup
js/screens.js             loading sequence, menu/level-select nav, Settings/Leaderboard wiring
js/game.js                the actual game loop: merging, combos, landing squash, wind, XP, danger timer
js/main.js                boots everything, owns the Game instance, wires level selection
assets/sounds/            8 SFX + a looping music bed — see the Audio section below
manifest.json            PWA manifest (Android "Add to Home Screen")
sw.js                     tiny offline cache (optional, safe to ignore)
icons/icon.svg            app icon used by the manifest
package.json              Capacitor dependencies — shared by local builds and the CI workflow
capacitor.config.json    Capacitor config for the native Android build (set your appId before building)
setup-android.sh          one-shot LOCAL build script (installs Capacitor + icons into android/)
scripts/install-android-icons.sh   icon-copying logic shared by setup-android.sh and CI, so they can't drift apart
.github/workflows/build-android.yml   CI pipeline — builds an APK automatically on every push
android-assets/           pre-generated app icons (all densities, adaptive) + Play Store listing graphics
GITHUB_ACTIONS_GUIDE.md  fully automated APK builds — push to GitHub, download the APK, no manual steps
ANDROID_BUILD_GUIDE.md   manual walkthrough: Capacitor → signed APK/AAB → Play Console checklist
```

Why this many files and not one giant script: each one owns exactly one job
(physics, particles, shake, audio, settings, leaderboard, XP, themes, screen
flow, fruit art), so any one concern — say, adding a 4th orchard, or
retuning the combo window — stays a small, isolated change instead of a
hunt through unrelated code.

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

`js/screens.js` + `js/main.js` own navigation between five states:

1. **Loading screen** — a real progress bar driven by actual steps (waiting
   for fonts, decoding the audio files), not a fake timer, with a small
   minimum-display floor (`CONFIG.MIN_LOADING_SCREEN_MS`) so it still reads
   as a loading screen even on a fast connection.
2. **Main menu** — Play / Settings / Leaderboard, with a handful of fruit
   emoji drifting subtly in the background (`.bg-fruit` in `index.html`,
   randomized per-element timing in `screens.js` so they don't move in
   lockstep).
3. **Level Select** — one card per orchard (see Progression below), locked
   or unlocked based on lifetime XP. Reached from "Play," and also from the
   Game Over modal's "Change Orchard" button.
4. **Game screen** — created lazily on the first level selection (no point
   ticking physics behind the menu). Selecting a level again later — same
   or different orchard — just restarts the same `Game` instance in place
   via `Game#restart(theme)`.
5. **Settings** and **Leaderboard** are overlays, not separate screens —
   they can open on top of the menu *or* on top of the game (via the ⚙ icon
   in the in-game HUD), and opening Settings mid-game calls `game.pause()`
   so physics/timers genuinely freeze rather than continuing invisibly
   behind the overlay.

## Progression: XP, levels, and unlockable orchards

`js/xp.js` tracks **lifetime** XP (persisted, never reset by Game Over) and
derives a level from it via a geometric curve — each level needs more XP
than the last (`CONFIG.XP_BASE_PER_LEVEL` / `CONFIG.XP_GROWTH_RATE`). Every
merge grants XP equal to the score it earns, so chasing a high score and
leveling up are the same action. The XP bar at the top of the game screen
animates its fill on every gain and flashes gold on a level-up
(`.level-up-flash` in `css/style.css`).

`js/themes.js` defines three orchards, unlocked by that same lifetime XP
total:

| Orchard | Unlocks at | Fruits | Jar width | Drop pace | Wind |
|---|---|---|---|---|---|
| Classic Orchard | 0 XP (default) | Cherry → Strawberry → Orange → Apple → Watermelon | 100% | normal | none |
| Tropical Paradise | 500 XP | Mango → Coconut → Pineapple → Dragonfruit | 88% | ~18% faster | gentle |
| Winter Berry Blast | 1500 XP | Holly → Blueberry → Cranberry → Frozen Melon | 78% | ~30% faster | stronger |

The jar-width and wind modifiers are real physics, not reskinning: a
narrower theme actually rebuilds Matter.js's walls closer together
(`PhysicsWorld`'s `playWidthScale` in `js/physics.js`), and wind is a small
continuously-oscillating horizontal force applied to every fruit in play
(`PhysicsWorld#applyWind`) — so later orchards are genuinely harder to
stack cleanly, not just visually different. Each theme's fruit ladder is
also independently sized (4 tiers for the new orchards vs. 5 for Classic),
since nothing in the merge logic assumes a fixed tier count.

## Fruit art & juice

`js/fruitRenderer.js` looks fruit illustrations up by a `kind` string (set
per-tier in `js/themes.js`) rather than tier index, so any theme can mix and
match freely. All 13 fruits across the three orchards are hand-illustrated
with layered canvas gradients for a glossy highlight — seeds on the
strawberry, fibrous texture and germination pores on the coconut, diamond
crosshatching and a spiky crown on the pineapple, scaled triangles on the
dragonfruit, frost cracks and an ice-crystal stub on the frozen melon, and
so on. An unrecognized `kind` safely falls back to a plain glossy circle
rather than crashing the renderer.

Merge juice is two stacked effects (`js/utils.js`): the merged fruit scales
up 0 → 1.2 → 1.0 with a non-uniform squash-then-round in the first fraction
of that tween (`squishPopScale`) — what actually reads as "juicy" rather
than just "appearing." Separately, **any** fruit's first forceful impact
with the floor, a wall, or another fruit (not just merges) triggers its own
quick squash-and-recover (`landingSquashScale`), tracked per-body so it only
fires once. Screen shake scales with the merging tier, so a cherry-merge is
a light tap and a top-tier merge properly shakes the screen.

**Combo chains:** merges completed within `CONFIG.COMBO_WINDOW_MS` of each
other build a streak; a gap longer than that starts a fresh chain. At 2+ in
a row, a growing "COMBO x N" popup appears at the merge point
(`js/floatingText.js`). Every merge also spawns a plain "+score" popup, big
merges (tier ≥ `CONFIG.SCREEN_SHAKE_BIG_MERGE_TIER`) get a random callout
("SPLASH!", "JUICY!", "POW!", "NICE!"), and a level-up crossing spawns its
own "LEVEL UP!" callout with an extra screen-shake kick.

A faint dashed line drops straight down from the current aim position at
all times (not just on demand) so players can precisely line up a drop
before committing to it.

## Game Over behavior

The HUD score is **not** reset to 0 the instant a fruit overflows the danger
line for 2 seconds. The board freezes and the Game Over modal pops in
(`@keyframes modalPopIn`), with the final score counting up from 0 rather
than just appearing (`UI#_animateScoreTally`). It shows `FINAL SCORE` and
`PERSONAL BEST`, and if you just beat your record, a bouncing "New Personal
Best!" banner appears alongside a confetti burst on its own small canvas
inside the modal (`js/confetti.js`) — separate from the main game's
in-jar particle system, since it's a screen-space celebration rather than a
world-space merge effect. Only "Play Again" actually clears the board and
zeroes the score; a secondary "Change Orchard" link returns to Level Select
(picking up any newly-unlocked theme from the XP just earned) without
losing the run's leaderboard entry, which is recorded the moment the modal
appears (`js/leaderboard.js`, top 5 scores).

## Audio

Real sound is wired up and playing — `js/audio.js` loads eight short SFX plus
a looping music bed from `assets/sounds/`, with file paths and per-sound
volume balancing kept in `js/sfxLibrary.js` (separate from the playback
engine, so tuning a sound's loudness never means touching Web Audio code).

| Sound | Fires on |
|---|---|
| `drop.ogg` | every drop |
| `merge.ogg` | every merge (pitch-shifted per tier — see below) |
| `land.ogg` | a fruit's first real impact with anything (matches the landing-squash visual) |
| `combo.ogg` | a chained merge, ≥2 in the streak (pitch rises slightly with the streak) |
| `levelUp.ogg` | crossing an XP level threshold |
| `unlock.ogg` | unlocking a new orchard |
| `click.ogg` | menu/UI navigation taps |
| `gameover.ogg` | game over |
| `music_loop.ogg` | looping background music bed |

All SFX and music volume are live-wired to the Settings overlay's sliders
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

### About the music — and getting a "real" track instead

Every sound file here, including `music_loop.ogg`, is **synthesized from
scratch** (plain sine/noise generation in Python — see the comments in the
generation approach if you want to regenerate or retune it) specifically so
there's zero copyright risk shipping it. The current loop is tuned to be
upbeat: a driving eighth-note pluck pattern over a I–V–vi–IV chord
progression with a light percussive pulse, rather than a static ambient pad.

That said, an original synth track is never going to compete with a
real composed piece. If you want one, here are specific, verified, genuinely
free-for-commercial-use, no-attribution-required tracks that fit this game
well (Pixabay's license covers all of these — confirm current terms before
shipping, licenses can change):

- ["Puzzle Game Loop - Bright Casual Video Game Music" by Cyberwave-Orchestra](https://pixabay.com/music/main-title-puzzle-game-loop-bright-casual-video-game-music-249201/) — closest match to this game's energy
- [Pixabay's "upbeat" music search](https://pixabay.com/music/search/upbeat/) for more options

To swap one in: download the MP3, drop it in `assets/sounds/` as
`music_loop.ogg` (or update the `MUSIC_FILE` path in `js/sfxLibrary.js` if
you keep the `.mp3` extension), done. The same applies to any of the SFX —
replace a file in `assets/sounds/` and update its path in `SOUND_FILES` in
`js/sfxLibrary.js` if you rename it.

## Publishing to itch.io (web)

1. Zip the **contents** of this folder (index.html should be at the zip's root, not nested in a subfolder).
2. On itch.io: New Project → Kind of project: **HTML** → upload the zip.
3. Check **"This file will be played in the browser"** next to index.html.
4. Set viewport to a fixed size like 420 × 700 (or "automatically scale") — the game
   itself is responsive and will fit either.
5. Publish. No build step, no server-side code, nothing else required.

## Getting this onto Android

Three paths, from least to most effort:

**1. Instant path — installable web app (no Play Store, no native build):**
Open the page in Chrome on an Android phone → menu → **"Add to shortcut" / "Install app."**
The `manifest.json` + `sw.js` already in this project make it launch full-screen with
its own icon, just like a native app. This is the fastest way to get it on a phone today.

**2. Automated APK — GitHub Actions builds it for you:**
Push this folder to a GitHub repo and a workflow (`.github/workflows/build-android.yml`)
builds a real, installable APK automatically on every push — no Android Studio, no manual
Capacitor commands. Full walkthrough in **`GITHUB_ACTIONS_GUIDE.md`**.

**3. Manual native build — for local control or the Play Store:**
This needs a native build environment (Android Studio + Android SDK) that isn't available
inside this chat, so you'll do this step on your own machine. Full walkthrough — including
pre-generated app icons, adaptive icon layers, Play Store listing graphics, signing, and a
one-shot setup script — is in **`ANDROID_BUILD_GUIDE.md`**.

## Tuning the feel

Almost everything worth tweaking lives in `js/config.js`: drop cooldown, danger-line
position and timing (2 seconds by default), screen-shake strength, gravity/bounciness,
the pop/squish/landing tween durations, the combo chain window, and the XP curve.
Fruit colors, sizes, scores, and theme difficulty modifiers (jar width, drop pace,
wind) live in `js/themes.js`; the actual illustrations (seeds, stripes, leaves,
gloss) live in `js/fruitRenderer.js`. Default volume levels live in `js/settings.js`.
