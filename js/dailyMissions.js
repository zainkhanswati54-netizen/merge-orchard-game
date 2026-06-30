// ---------------------------------------------------------------------------
// DAILY MISSIONS SYSTEM
// ---------------------------------------------------------------------------
// Three missions per day, reset at midnight. Persist in localStorage.
// ---------------------------------------------------------------------------

import { CONFIG } from './config.js';

// 🎯 Psychology-driven missions: mix of easy wins + satisfying challenges
// Easy missions give quick dopamine. Harder ones feel EARNED.
const MISSION_TEMPLATES = [
  // === EASY (quick win, always feel achievable) ===
  { id: 'play_1',         type: 'games',    target: 1,   desc: '🎮 Play 1 match',                   reward: { coins: 50,  xp: 80  } },
  { id: 'drop_10',        type: 'drop',     target: 10,  desc: '🍒 Drop 10 fruits',                 reward: { coins: 40,  xp: 60  } },
  { id: 'merge_10',       type: 'merge',    target: 10,  desc: '✨ Merge 10 fruits',                reward: { coins: 60,  xp: 100 } },
  { id: 'score_300',      type: 'score',    target: 300, desc: '⭐ Score 300 points',               reward: { coins: 55,  xp: 90  } },
  { id: 'combo_2',        type: 'combo',    target: 2,   desc: '🔥 Get a Combo x2',                reward: { coins: 70,  xp: 110 } },

  // === MEDIUM (satisfying when done) ===
  { id: 'merge_30',       type: 'merge',    target: 30,  desc: '✨ Merge 30 fruits',                reward: { coins: 120, xp: 200 } },
  { id: 'play_3',         type: 'games',    target: 3,   desc: '🎮 Play 3 matches',                 reward: { coins: 100, xp: 160 } },
  { id: 'score_800',      type: 'score',    target: 800, desc: '⭐ Score 800 points',               reward: { coins: 130, xp: 220 } },
  { id: 'combo_3',        type: 'combo',    target: 3,   desc: '🔥 Get a Combo x3',                reward: { coins: 150, xp: 250 } },
  { id: 'drop_50',        type: 'drop',     target: 50,  desc: '🍊 Drop 50 fruits',                 reward: { coins: 110, xp: 180 } },
  { id: 'danger_3',       type: 'dangerMerge', target: 3, desc: '⚡ 3 Danger-zone merges',         reward: { coins: 140, xp: 230 } },

  // === HARD (real challenge, BIG reward feel) ===
  { id: 'merge_60',       type: 'merge',    target: 60,  desc: '🌟 Merge 60 fruits (Pro!)',         reward: { coins: 220, xp: 380 } },
  { id: 'score_1500',     type: 'score',    target: 1500,'desc': '🏆 Score 1500 points',            reward: { coins: 250, xp: 420 } },
  { id: 'combo_5',        type: 'combo',    target: 5,   desc: '🔥 Legendary Combo x5!',            reward: { coins: 300, xp: 500 } },
  { id: 'danger_7',       type: 'dangerMerge', target: 7, desc: '⚡ 7 Danger-zone merges (Risky!)', reward: { coins: 280, xp: 460 } },
];

function _getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function _pickDailyMissions() {
  // Psychologically ideal mix: 1 easy (quick win) + 1 medium + 1 hard (aspirational)
  const seed = _getTodayKey().split('-').reduce((a, b) => a + parseInt(b), 0);
  const easy   = MISSION_TEMPLATES.slice(0, 5);
  const medium = MISSION_TEMPLATES.slice(5, 11);
  const hard   = MISSION_TEMPLATES.slice(11);

  const pick = (pool) => {
    const s = pool.slice().sort((a, b) => _hash(seed + a.id) - _hash(seed + b.id));
    return s[0];
  };

  const picked = [pick(easy), pick(medium), pick(hard)];
  return picked.map((t) => ({
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
