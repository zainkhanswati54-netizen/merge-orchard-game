// ---------------------------------------------------------------------------
// ACHIEVEMENT SYSTEM
// ---------------------------------------------------------------------------
// 20 achievements tracked permanently in localStorage. Each unlocks once.
// ---------------------------------------------------------------------------

import { CONFIG } from './config.js';

export const ACHIEVEMENTS = [
  { id: 'first_merge',      name: 'First Merge',       desc: 'Perform your first merge.' },
  { id: 'merges_10',        name: 'Warming Up',         desc: 'Perform 10 merges in one game.' },
  { id: 'merges_50',        name: 'On a Roll',          desc: 'Perform 50 merges in one game.' },
  { id: 'merges_100',       name: 'Merge Master',       desc: 'Perform 100 merges total.' },
  { id: 'merges_1000',      name: 'Fruit Legend',       desc: 'Perform 1,000 merges total.' },
  { id: 'combo_3',          name: 'Chain Reaction',     desc: 'Achieve a Combo x3.' },
  { id: 'combo_5',          name: 'Combo King',         desc: 'Achieve a Combo x5.' },
  { id: 'combo_10',         name: 'Legendary Combo',    desc: 'Achieve a Combo x10 — Legendary!' },
  { id: 'score_500',        name: 'Getting Started',    desc: 'Score 500 points in one game.' },
  { id: 'score_1000',       name: 'Bronze Run',         desc: 'Score 1,000 points in one game.' },
  { id: 'score_2500',       name: 'Silver Run',         desc: 'Score 2,500 points in one game.' },
  { id: 'score_5000',       name: 'Gold Run',           desc: 'Score 5,000 points in one game.' },
  { id: 'score_10000',      name: 'Diamond Run',        desc: 'Score 10,000 points in one game.' },
  { id: 'score_20000',      name: 'Legend Run',         desc: 'Score 20,000 points in one game.' },
  { id: 'risk_merge',       name: 'Living Dangerously', desc: 'Merge while in the danger zone.' },
  { id: 'risk_10',          name: 'Thrill Seeker',      desc: 'Make 10 danger-zone merges.' },
  { id: 'level_5',          name: 'Apprentice',         desc: 'Reach Level 5.' },
  { id: 'level_10',         name: 'Veteran',            desc: 'Reach Level 10.' },
  { id: 'level_25',         name: 'Elite Grower',       desc: 'Reach Level 25.' },
  { id: 'use_power',        name: 'Power Up!',          desc: 'Use a special power for the first time.' },
];

let unlocked = _load();
const listeners = [];

function _load() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY_ACHIEVEMENTS);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch (e) {
    return new Set();
  }
}

function _save() {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY_ACHIEVEMENTS, JSON.stringify([...unlocked]));
  } catch (e) {/* ignore */}
}

export function isUnlocked(id) {
  return unlocked.has(id);
}

export function getUnlockedAchievements() {
  return ACHIEVEMENTS.filter((a) => unlocked.has(a.id));
}

export function getLockedAchievements() {
  return ACHIEVEMENTS.filter((a) => !unlocked.has(a.id));
}

// Returns the achievement if newly unlocked, null if already owned.
export function unlockAchievement(id) {
  if (unlocked.has(id)) return null;
  const achievement = ACHIEVEMENTS.find((a) => a.id === id);
  if (!achievement) return null;
  unlocked.add(id);
  _save();
  for (const fn of listeners) fn(achievement);
  return achievement;
}

export function onAchievementUnlocked(fn) {
  listeners.push(fn);
}
