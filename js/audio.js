// ---------------------------------------------------------------------------
// AUDIO HOOKS
// ---------------------------------------------------------------------------
// These are placeholder functions. Each one logs to the console so you can
// confirm exactly when the game *wants* a sound to play, before any audio
// files exist. When you're ready to add real sound, drop .mp3/.wav files into
// /assets/sounds/ and uncomment the Audio() lines below (or replace the body
// of each function with your own audio engine call, e.g. Howler.js).
// ---------------------------------------------------------------------------

// Example of how to wire a real file in later:
// const dropClip = new Audio('assets/sounds/drop.mp3');
// export function playDropSound() {
//   dropClip.currentTime = 0;
//   dropClip.play().catch(() => {});
// }

export function playDropSound() {
  console.log('[audio] playDropSound()');
}

export function playMergeSound(tier) {
  console.log(`[audio] playMergeSound(tier=${tier})`);
}

export function playGameOverSound() {
  console.log('[audio] playGameOverSound()');
}
