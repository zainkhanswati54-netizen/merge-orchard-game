// ---------------------------------------------------------------------------
// AUDIO ENGINE
// ---------------------------------------------------------------------------
// Real Web Audio playback for SFX, plus a looping background music bed, both
// wired live to the Settings overlay's volume sliders via settings.js.
// Sound file paths and per-sound gains live in sfxLibrary.js — this module
// is purely playback plumbing.
//
// One trick worth calling out: the merge SFX is a single base file whose
// *playback rate* is shifted per tier — lower tiers play it back faster/
// higher (light, crisp), the max-tier merge plays it back slower/lower
// (deep, impactful). One small file instead of five separate recordings.
//
// Every hook still logs to the console, exactly as before, so you can always
// confirm when each sound *should* fire.
// ---------------------------------------------------------------------------

import { MAX_TIER_INDEX } from './items.js';
import { getSettings, onSettingsChange } from './settings.js';
import { SOUND_FILES, MUSIC_FILE, SOUND_GAIN } from './sfxLibrary.js';

let audioCtx = null;
const buffers = {};
let loadPromise = null;
let musicEl = null;

function ensureContext() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null; // very old browser with no Web Audio support at all
    audioCtx = new AC();
  }
  // Mobile browsers suspend new AudioContexts until a user gesture resumes
  // them — calling this from inside a click/tap/keypress handler (see
  // onFirstInteraction in input.js) satisfies that requirement.
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

async function loadBuffer(ctx, key, url) {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  buffers[key] = await ctx.decodeAudioData(arrayBuffer);
}

function ensureMusicElement() {
  if (!musicEl) {
    musicEl = new Audio(MUSIC_FILE);
    musicEl.loop = true;
    musicEl.volume = getSettings().musicVolume;
  }
  return musicEl;
}

// Keep the music element's volume in sync the instant the slider moves —
// no need to wait for the next play() call like SFX gain does.
onSettingsChange((settings) => {
  if (musicEl) musicEl.volume = settings.musicVolume;
});

// Call once, from a user-gesture context (or as early as possible, e.g. the
// loading screen — decoding audio doesn't require a gesture, only *playback*
// does). Safe to call repeatedly: returns the same promise every time after
// the first call. Resolves even on failure so callers can always `await` it
// without a try/catch of their own.
export function preloadAudio() {
  if (loadPromise) return loadPromise;
  const ctx = ensureContext();
  if (!ctx) return Promise.resolve();
  loadPromise = Promise.all(
    Object.entries(SOUND_FILES).map(([key, url]) => loadBuffer(ctx, key, url))
  )
    .then(() => console.log('[audio] sound files loaded'))
    .catch((err) => console.warn('[audio] could not load sound files, falling back to silent mode:', err));
  return loadPromise;
}

// Starts the background music loop. Safe to call repeatedly — does nothing
// if it's already playing. Must be called from a user gesture (or it will
// silently fail to start until the next call that IS inside one).
export function startMusic() {
  const el = ensureMusicElement();
  if (!el.paused) return;
  el.play().catch(() => {
    console.log('[audio] music start deferred — waiting for a user gesture');
  });
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function play(key, { rate = 1, gain } = {}) {
  const ctx = ensureContext();
  if (!ctx || !buffers[key]) return false; // not loaded yet, or audio unsupported
  const source = ctx.createBufferSource();
  source.buffer = buffers[key];
  source.playbackRate.value = rate;

  const baseGain = gain !== undefined ? gain : (SOUND_GAIN[key] ?? 1);
  const gainNode = ctx.createGain();
  gainNode.gain.value = baseGain * getSettings().sfxVolume;

  source.connect(gainNode).connect(ctx.destination);
  source.start();
  return true;
}

function logPlay(name, played, extra = '') {
  const suffix = extra ? ` ${extra}` : '';
  console.log(`[audio] ${name}()${suffix}${played ? '' : ' (buffer not ready — preloadAudio() may not have run yet)'}`);
}

export function playDropSound() {
  logPlay('playDropSound', play('drop', { rate: 1 }));
}

// tier = the resulting merged tier index (1..MAX_TIER_INDEX).
// Lower tiers play back faster/higher (light, crisp). Higher tiers play
// back slower/lower (deep, impactful) — matching the feel you described,
// even though that means playbackRate goes DOWN as tier goes UP.
export function playMergeSound(tier) {
  const minTier = 1; // tier 0 is never a merge result, only a drop
  const t = Math.max(0, Math.min(1, (tier - minTier) / (MAX_TIER_INDEX - minTier)));
  const rate = lerp(1.4, 0.65, t);
  const played = play('merge', { rate });
  logPlay('playMergeSound', played, `(tier=${tier}, pitch rate ${rate.toFixed(2)})`);
}

export function playGameOverSound() {
  logPlay('playGameOverSound', play('gameOver', { rate: 1 }));
}

// --- New interactive SFX ---------------------------------------------------

// Short UI tap — menu buttons, settings, leaderboard, level cards.
export function playClickSound() {
  logPlay('playClickSound', play('click', { rate: 1 }));
}

// Fires once per fruit on its first real impact (see js/game.js's landing
// squash detection) — kept quiet by default (see SOUND_GAIN) since it can
// fire often.
export function playLandSound() {
  logPlay('playLandSound', play('land', { rate: 1 }));
}

export function playLevelUpSound() {
  logPlay('playLevelUpSound', play('levelUp', { rate: 1 }));
}

// comboCount nudges the pitch up slightly per step, so a long chain
// audibly escalates rather than repeating identically.
export function playComboSound(comboCount) {
  const rate = Math.min(1.6, 1 + (comboCount - 2) * 0.08);
  const played = play('combo', { rate });
  logPlay('playComboSound', played, `(combo=${comboCount}, pitch rate ${rate.toFixed(2)})`);
}

export function playUnlockSound() {
  logPlay('playUnlockSound', play('unlock', { rate: 1 }));
}

// progress01 (0-1, how close to game over) nudges the pitch up slightly as
// danger escalates, on top of game.js re-triggering it at a faster interval
// — both effects compound into a believable "things are getting worse" cue.
// Deliberately skips the usual console log (unlike the other one-shot SFX
// above) since this can fire many times per second near the danger
// threshold — logging every beat would just spam the console.
export function playHeartbeatSound(progress01 = 0) {
  const rate = 1 + Math.min(1, Math.max(0, progress01)) * 0.35;
  play('heartbeat', { rate });
}
