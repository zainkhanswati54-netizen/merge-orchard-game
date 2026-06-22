// ---------------------------------------------------------------------------
// SFX LIBRARY
// ---------------------------------------------------------------------------
// Pure data: where each sound file lives and how loud it plays by default.
// Kept separate from audio.js's playback engine so adding/retuning a sound
// never requires touching loading or Web Audio plumbing — just edit a row
// here.
// ---------------------------------------------------------------------------

export const SOUND_FILES = {
  drop: 'assets/sounds/drop.ogg',
  merge: 'assets/sounds/merge.ogg',
  gameOver: 'assets/sounds/gameover.ogg',
  click: 'assets/sounds/click.ogg',
  land: 'assets/sounds/land.ogg',
  levelUp: 'assets/sounds/levelup.ogg',
  combo: 'assets/sounds/combo.ogg',
  unlock: 'assets/sounds/unlock.ogg',
  heartbeat: 'assets/sounds/heartbeat.ogg',
};

export const MUSIC_FILE = 'assets/sounds/music_loop.ogg';

// Default per-sound gain, applied on top of the player's SFX volume slider —
// lets quieter/louder source recordings get balanced against each other
// without re-rendering the files.
export const SOUND_GAIN = {
  drop: 0.7,
  merge: 0.85,
  gameOver: 0.9,
  click: 0.5,
  land: 0.45, // subtle — this fires often (any fruit landing), shouldn't dominate
  levelUp: 0.85,
  combo: 0.6,
  unlock: 0.95,
  heartbeat: 0.65,
};
