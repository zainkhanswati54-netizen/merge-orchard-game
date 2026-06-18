// ---------------------------------------------------------------------------
// AUDIO ENGINE
// ---------------------------------------------------------------------------
// Real Web Audio playback, with one trick worth calling out: the merge sound
// is a single base file whose *playback rate* is shifted per tier. That's
// what gives lower tiers a light, crisp "ding" and the max-tier merge a
// deep, heavy "thud" — one small file instead of five separate recordings.
//
// Every call still logs to the console (as before) so you can confirm
// exactly when each hook fires, even once real audio is playing.
// ---------------------------------------------------------------------------

import { MAX_TIER_INDEX } from './items.js';

const SOUND_FILES = {
  drop: 'assets/sounds/drop.ogg',
  merge: 'assets/sounds/merge.ogg',
  gameOver: 'assets/sounds/gameover.ogg',
};

let audioCtx = null;
const buffers = {};
let loadStarted = false;

function ensureContext() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null; // very old browser with no Web Audio support at all
    audioCtx = new AC();
  }
  // Mobile browsers suspend new AudioContexts until a user gesture resumes
  // them — calling this from inside tryDrop() (a click/tap/keypress handler)
  // satisfies that requirement.
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

// Call once, from a user-gesture context. Safe to call repeatedly — only
// loads once. If the files are missing or fail to decode, the game falls
// back to silent console logging rather than throwing.
export function preloadAudio() {
  if (loadStarted) return;
  loadStarted = true;
  const ctx = ensureContext();
  if (!ctx) return;
  Promise.all(
    Object.entries(SOUND_FILES).map(([key, url]) => loadBuffer(ctx, key, url))
  )
    .then(() => console.log('[audio] sound files loaded'))
    .catch((err) => console.warn('[audio] could not load sound files, falling back to silent mode:', err));
}

function play(key, { rate = 1, gain = 1 } = {}) {
  const ctx = ensureContext();
  if (!ctx || !buffers[key]) return false; // not loaded yet, or audio unsupported
  const source = ctx.createBufferSource();
  source.buffer = buffers[key];
  source.playbackRate.value = rate;

  const gainNode = ctx.createGain();
  gainNode.gain.value = gain;

  source.connect(gainNode).connect(ctx.destination);
  source.start();
  return true;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
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
