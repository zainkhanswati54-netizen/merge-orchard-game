import { CONFIG } from './config.js';

function load() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY_LEADERBOARD);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY_LEADERBOARD, JSON.stringify(list));
  } catch (e) {
    /* ignore — leaderboard just won't persist this session */
  }
}

export function getLeaderboard() {
  return load();
}

// Adds a finished run's score, keeping only the top N entries.
export function recordScore(score, date = new Date()) {
  const list = load();
  list.push({ score, date: date.toISOString() });
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, CONFIG.LEADERBOARD_SIZE);
  save(trimmed);
  return trimmed;
}
