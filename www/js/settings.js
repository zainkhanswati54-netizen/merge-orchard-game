import { CONFIG } from './config.js';

// Single source of truth for user-adjustable settings. Anything that needs
// to react to a volume change (audio.js) or display the current value
// (the Settings overlay) reads from here rather than keeping its own copy.
const DEFAULTS = {
  sfxVolume: 0.8,
  musicVolume: 0.35,
};

let state = { ...DEFAULTS };
const listeners = [];

function load() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY_SETTINGS);
    if (raw) state = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) {
    state = { ...DEFAULTS }; // corrupt or unavailable storage — fall back quietly
  }
}

function save() {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY_SETTINGS, JSON.stringify(state));
  } catch (e) {
    /* ignore — settings just won't persist this session */
  }
}

load();

export function getSettings() {
  return { ...state };
}

export function setSetting(key, value) {
  state[key] = value;
  save();
  for (const fn of listeners) fn(getSettings());
}

// Lets audio.js (or anything else) react live as a slider moves, without
// polling.
export function onSettingsChange(fn) {
  listeners.push(fn);
}
