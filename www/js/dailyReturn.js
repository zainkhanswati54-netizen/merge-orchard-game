// ---------------------------------------------------------------------------
// DAILY RETURN SYSTEM — Login Rewards, Streak Rewards, Orchard Tasks
// ---------------------------------------------------------------------------

const KEY = 'legend_orchard_daily_return';

const LOGIN_REWARDS = [
  { day: 1,  coins: 50,   xp: 100,  bonus: null,              label: 'Day 1' },
  { day: 2,  coins: 75,   xp: 150,  bonus: null,              label: 'Day 2' },
  { day: 3,  coins: 100,  xp: 200,  bonus: 'power_freeze',    label: 'Day 3 — Bonus Power!' },
  { day: 4,  coins: 125,  xp: 250,  bonus: null,              label: 'Day 4' },
  { day: 5,  coins: 150,  xp: 300,  bonus: null,              label: 'Day 5' },
  { day: 6,  coins: 200,  xp: 400,  bonus: 'power_magnet',    label: 'Day 6 — Bonus Power!' },
  { day: 7,  coins: 500,  xp: 1000, bonus: 'golden_fruit',    label: 'Day 7 — WEEKLY BONUS! 🎉' },
];

const DAILY_ORCHARD_TASKS = [
  { id: 'task_merge_30',    desc: '🍎 Perform 30 merges',         target: 30,  reward: { coins: 80, xp: 120 } },
  { id: 'task_score_1000',  desc: '⭐ Score 1,000 Life Energy',   target: 1000,reward: { coins: 100, xp: 150 } },
  { id: 'task_play_3',      desc: '🌿 Play 3 chapters',           target: 3,   reward: { coins: 60, xp: 90 } },
  { id: 'task_combo_5',     desc: '⚡ Get a 5-combo',             target: 5,   reward: { coins: 150, xp: 200 } },
  { id: 'task_no_overflow', desc: '🛡️ Complete a chapter with no overflow danger', target: 1, reward: { coins: 200, xp: 300 } },
];

function _today() {
  return new Date().toDateString();
}

function _load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : _defaultState();
  } catch(e) { return _defaultState(); }
}

function _defaultState() {
  return {
    lastLoginDate: null,
    streakDay: 0,
    claimedToday: false,
    tasks: [],
    taskDate: null,
    lastClaimedDay: 0,
  };
}

function _save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {}
}

export function checkDailyLogin() {
  const state = _load();
  const today = _today();

  if (state.lastLoginDate === today) {
    return { isNew: false, state };
  }

  // Check streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isStreak = state.lastLoginDate === yesterday.toDateString();

  if (isStreak) {
    state.streakDay = Math.min(7, state.streakDay + 1);
  } else {
    state.streakDay = 1;
  }

  state.lastLoginDate = today;
  state.claimedToday = false;

  // Generate new daily tasks
  state.tasks = _generateTasks(today);
  state.taskDate = today;

  _save(state);
  return { isNew: true, state, streakDay: state.streakDay };
}

function _generateTasks(seed) {
  // Pick 3 tasks deterministically from seed
  const all = [...DAILY_ORCHARD_TASKS];
  const hash = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const picked = [];
  for (let i = 0; i < 3; i++) {
    picked.push(all.splice((hash + i * 7) % all.length, 1)[0]);
  }
  return picked.map(t => ({ ...t, progress: 0, claimed: false }));
}

export function getLoginRewardForDay(day) {
  return LOGIN_REWARDS[(day - 1) % 7];
}

export function claimLoginReward() {
  const state = _load();
  if (state.claimedToday) return null;
  const reward = getLoginRewardForDay(state.streakDay);
  state.claimedToday = true;
  state.lastClaimedDay = state.streakDay;
  _save(state);
  return reward;
}

export function getDailyTasks() {
  const state = _load();
  const today = _today();
  if (state.taskDate !== today) return [];
  return state.tasks || [];
}

export function updateTaskProgress(taskId, progress) {
  const state = _load();
  const task = state.tasks?.find(t => t.id === taskId);
  if (!task) return;
  task.progress = Math.max(task.progress, progress);
  if (task.progress >= task.target) task.completed = true;
  _save(state);
}

export function claimTaskReward(taskId) {
  const state = _load();
  const task = state.tasks?.find(t => t.id === taskId);
  if (!task || !task.completed || task.claimed) return null;
  task.claimed = true;
  _save(state);
  return task.reward;
}

export function getDailyReturnState() {
  return _load();
}

export function hasPendingLoginReward() {
  const state = _load();
  return !state.claimedToday;
}
