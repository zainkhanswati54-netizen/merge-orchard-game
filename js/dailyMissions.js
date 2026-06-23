// ---------------------------------------------------------------------------
// DAILY MISSIONS SYSTEM
// ---------------------------------------------------------------------------
// Three missions per day, reset at midnight. Persist in localStorage.
// ---------------------------------------------------------------------------

import { CONFIG } from './config.js';

const MISSION_TEMPLATES = [
  { id: 'merge_fruits',   type: 'merge',    target: 20, desc: 'Merge {n} fruits',          reward: { coins: 50,  xp: 100 } },
  { id: 'merge_fruits_2', type: 'merge',    target: 50, desc: 'Merge {n} fruits',          reward: { coins: 120, xp: 250 } },
  { id: 'score_points',   type: 'score',    target: 500,  desc: 'Score {n} points',        reward: { coins: 40,  xp: 80  } },
  { id: 'score_points_2', type: 'score',    target: 1500, desc: 'Score {n} points',        reward: { coins: 100, xp: 200 } },
  { id: 'combo_3',        type: 'combo',    target: 3,  desc: 'Achieve a Combo x{n}',      reward: { coins: 60,  xp: 120 } },
  { id: 'combo_5',        type: 'combo',    target: 5,  desc: 'Achieve a Combo x{n}',      reward: { coins: 150, xp: 300 } },
  { id: 'play_games',     type: 'games',    target: 3,  desc: 'Play {n} matches',          reward: { coins: 30,  xp: 75  } },
  { id: 'drop_fruits',    type: 'drop',     target: 30, desc: 'Drop {n} fruits',           reward: { coins: 45,  xp: 90  } },
  { id: 'danger_merge',   type: 'dangerMerge', target: 5, desc: 'Make {n} danger-zone merges', reward: { coins: 80, xp: 160 } },
];

function _getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function _pickDailyMissions() {
  // Use today's date as a seed for deterministic daily selection
  const seed = _getTodayKey().split('-').reduce((a, b) => a + parseInt(b), 0);
  const shuffled = [...MISSION_TEMPLATES].sort((a, b) => {
    const ha = _hash(seed + a.id);
    const hb = _hash(seed + b.id);
    return ha - hb;
  });
  return shuffled.slice(0, 3).map((t) => ({
    ...t,
    desc: t.desc.replace('{n}', t.target),
    progress: 0,
    completed: false,
    rewardClaimed: false,
  }));
}

function _hash(str) {
  let h = 0;
  for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function _load() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY_DAILY_MISSIONS);
    if (!raw) return null;
    const { date, missions } = JSON.parse(raw);
    if (date !== _getTodayKey()) return null;
    return missions;
  } catch (e) {
    return null;
  }
}

function _save(missions) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY_DAILY_MISSIONS, JSON.stringify({
      date: _getTodayKey(),
      missions,
    }));
  } catch (e) {/* ignore */}
}

let missions = _load() || _pickDailyMissions();
const listeners = [];

export function getDailyMissions() {
  return missions;
}

export function reportMissionProgress(type, amount = 1) {
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

export function claimMissionReward(missionId) {
  const m = missions.find((x) => x.id === missionId);
  if (!m || !m.completed || m.rewardClaimed) return null;
  m.rewardClaimed = true;
  _save(missions);
  return m.reward;
}

export function onMissionsChange(fn) {
  listeners.push(fn);
}

export function getCompletedUnclaimedCount() {
  return missions.filter((m) => m.completed && !m.rewardClaimed).length;
}
