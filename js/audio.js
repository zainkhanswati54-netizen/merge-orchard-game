// ---------------------------------------------------------------------------
// AUDIO ENGINE
// ---------------------------------------------------------------------------
// Real Web Audio playback for SFX, plus a looping background music bed, both
// wired live to the Settings overlay's volume sliders via settings.js.
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

const SOUND_FILES = {
  drop: 'assets/sounds/drop.ogg',
  merge: 'assets/sounds/merge.ogg',
  gameOver: 'assets/sounds/gameover.ogg',
};
const MUSIC_FILE = 'assets/sounds/music_loop.ogg';

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

function play(key, { rate = 1, gain = 1 } = {}) {
  const ctx = ensureContext();
  if (!ctx || !buffers[key]) return false; // not loaded yet, or audio unsupported
  const source = ctx.createBufferSource();
  source.buffer = buffers[key];
  source.playbackRate.value = rate;

  const gainNode = ctx.createGain();
  gainNode.gain.value = gain * getSettings().sfxVolume;

  source.connect(gainNode).connect(ctx.destination);
  source.start();
  return true;
}

export function playDropSound() {
  const played = play('drop', { rate: 1, gain: 0.7 });
  console.log(`[audio] playDropSound()${played ? '' : ' (buffer not ready — preloadAudio() may not have run yet)'}`);
}

// tier = the resulting merged tier index (1..MAX_TIER_INDEX).
// Lower tiers play back faster/higher (light, crisp). Higher tiers play
// back slower/lower (deep, impactful) — matching the feel you described,
// even though that means playbackRate goes DOWN as tier goes UP.
export function playMergeSound(tier) {
  const minTier = 1; // tier 0 is never a merge result, only a drop
  const t = Math.max(0, Math.min(1, (tier - minTier) / (MAX_TIER_INDEX - minTier)));
  const rate = lerp(1.4, 0.65, t);
  const played = play('merge', { rate, gain: 0.85 });
  console.log(`[audio] playMergeSound(tier=${tier}) -> pitch rate ${rate.toFixed(2)}${played ? '' : ' (buffer not ready yet)'}`);
}

export function playGameOverSound() {
  const played = play('gameOver', { rate: 1, gain: 0.9 });
  console.log(`[audio] playGameOverSound()${played ? '' : ' (buffer not ready yet)'}`);
}
