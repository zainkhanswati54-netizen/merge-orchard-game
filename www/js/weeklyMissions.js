// ---------------------------------------------------------------------------
// WEEKLY MISSIONS SYSTEM
// ---------------------------------------------------------------------------
// Three big challenges per week. Reset every Monday at midnight.
// Much harder than daily missions, but with exclusive rewards.
// ---------------------------------------------------------------------------

import { CONFIG } from './config.js';

const WEEKLY_TEMPLATES = [
  { id: 'weekly_merges_500',  type: 'merge',       target: 500,  desc: 'Merge {n} fruits this week',       reward: { coins: 1000, xp: 2000 }, icon: '🍓' },
  { id: 'weekly_merges_1000', type: 'merge',       target: 1000, desc: 'Merge {n} fruits this week',       reward: { coins: 2000, xp: 4000 }, icon: '🍇' },
  { id: 'weekly_score_10000', type: 'score',       target: 10000,desc: 'Score {n} total points this week', reward: { coins: 1500, xp: 3000 }, icon: '⭐' },
  { id: 'weekly_score_25000', type: 'score',       target: 25000,desc: 'Score {n} total points this week', reward: { coins: 3000, xp: 6000 }, icon: '🌟' },
  { id: 'weekly_combos_50',   type: 'combo',       target: 50,   desc: 'Achieve {n} combos this week',     reward: { coins: 800,  xp: 1600 }, icon: '⚡' },
  { id: 'weekly_combos_100',  type: 'combo',       target: 100,  desc: 'Achieve {n} combos this week',     reward: { coins: 1800, xp: 3600 }, icon: '🏆' },
  { id: 'weekly_games_20',    type: 'games',       target: 20,   desc: 'Play {n} matches this week',       reward: { coins: 600,  xp: 1200 }, icon: '🎮' },
  { id: 'weekly_danger_30',   type: 'dangerMerge', target: 30,   desc: 'Make {n} danger-zone merges',      reward: { coins: 1200, xp: 2400 }, icon: '💀' },
  { id: 'weekly_legendary',   type: 'legendary',   target: 3,    desc: 'Achieve {n} Legendary Combos',     reward: { coins: 2500, xp: 5000 }, icon: '👑' },
  { id: 'weekly_drops_300',   type: 'drop',        target: 300,  desc: 'Drop {n} fruits this week',        reward: { coins: 700,  xp: 1400 }, icon: '🍊' },
];

const STORAGE_KEY = 'merge_weekly_missions';

function _getWeekKey() {
  const d = new Date();
  // Week number in the year
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
}

function _hash(str) {
  let h = 0;
  for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function _pickWeeklyMissions() {
  const seed = _getWeekKey().split(/\D/).reduce((a, b) => a + parseInt(b || 0), 0);
  const shuffled = [...WEEKLY_TEMPLATES].sort((a, b) => _hash(seed + a.id) - _hash(seed + b.id));
  return shuffled.slice(0, 3).map((t) => ({
    ...t,
    desc: t.desc.replace('{n}', t.target.toLocaleString()),
    progress: 0,
    completed: false,
    rewardClaimed: false,
  }));
}

function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { week, missions } = JSON.parse(raw);
    if (week !== _getWeekKey()) return null;
    return missions;
  } catch (e) {
    return null;
  }
}

function _save(missions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ week: _getWeekKey(), missions }));
  } catch (e) {}
}

let missions = _load() || _pickWeeklyMissions();
const listeners = [];

export function getWeeklyMissions() {
  return missions;
}

export function reportWeeklyProgress(type, amount = 1) {
  let changed = false;
  for (const m of missions) {
    if (m.type !== type || m.completed) continue;
    m.progress = Math.min(m.target, m.progress + amount);
    if (m.progress >= m.target) {
      m.completed = true;
    }
    changed = true;
  }
  if (changed) {
    _save(missions);
    for (const fn of listeners) fn(missions);
  }
}

export function claimWeeklyReward(missionId) {
  const m = missions.find((x) => x.id === missionId);
  if (!m || !m.completed || m.rewardClaimed) return null;
  m.rewardClaimed = true;
  _save(missions);
  for (const fn of listeners) fn(missions);
  return m.reward;
}

export function getWeeklyCompletedUnclaimedCount() {
  return missions.filter((m) => m.completed && !m.rewardClaimed).length;
}

export function onWeeklyMissionsChange(fn) {
  listeners.push(fn);
}

export function getWeekTimeRemaining() {
  const now = new Date();
  // Next Monday midnight
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  const ms = nextMonday - now;
  const hours = Math.floor(ms / 3600000);
  const mins  = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}
