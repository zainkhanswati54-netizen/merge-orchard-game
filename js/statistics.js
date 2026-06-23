// ---------------------------------------------------------------------------
// STATISTICS MANAGER
// ---------------------------------------------------------------------------
// Tracks lifetime and per-session stats. Persisted to localStorage.
// ---------------------------------------------------------------------------

import { CONFIG } from './config.js';

const DEFAULTS = {
  totalMerges: 0,
  totalGamesPlayed: 0,
  bestCombo: 0,
  bestScore: 0,
  totalCoinsEarned: 0,
  totalXPEarned: 0,
  totalFruitsDropped: 0,
};

let stats = _load();

function _load() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY_STATS);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

function _save() {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY_STATS, JSON.stringify(stats));
  } catch (e) {/* ignore */}
}

export function getStats() {
  return { ...stats };
}

export function recordMerge() {
  stats.totalMerges++;
  _save();
}

export function recordDrop() {
  stats.totalFruitsDropped++;
  _save();
}

export function recordCombo(count) {
  if (count > stats.bestCombo) {
    stats.bestCombo = count;
    _save();
  }
}

export function recordGameOver(score) {
  stats.totalGamesPlayed++;
  if (score > stats.bestScore) stats.bestScore = score;
  _save();
}

export function recordCoinsEarned(amount) {
  stats.totalCoinsEarned += amount;
  _save();
}

export function recordXPEarned(amount) {
  stats.totalXPEarned += amount;
  _save();
}
