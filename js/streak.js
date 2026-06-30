// ---------------------------------------------------------------------------
// DAILY STREAK SYSTEM
// Tracks consecutive days of play and returns a coin multiplier.
// ---------------------------------------------------------------------------

const KEY_STREAK = 'merge_streak';
const KEY_DATE   = 'merge_streak_date';

const TIERS = [
  { days: 30, mult: 3.0,  label: '3×',    color: '#FF4500' },
  { days: 14, mult: 2.0,  label: '2×',    color: '#FF6B35' },
  { days:  7, mult: 1.5,  label: '1.5×',  color: '#FFC857' },
  { days:  3, mult: 1.25, label: '1.25×', color: '#A8E6CF' },
  { days:  1, mult: 1.0,  label: '1×',    color: '#FFFFFF' },
];

function _todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function _yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function checkAndUpdateStreak() {
  const today     = _todayISO();
  const yesterday = _yesterdayISO();
  const lastDate  = localStorage.getItem(KEY_DATE);
  let   streak    = parseInt(localStorage.getItem(KEY_STREAK) || '0', 10);

  if (lastDate === today) {
    return { streak, isNew: false };
  }

  if (lastDate === yesterday) {
    streak += 1;
  } else {
    streak = 1;
  }

  localStorage.setItem(KEY_STREAK, String(streak));
  localStorage.setItem(KEY_DATE, today);
  return { streak, isNew: true };
}

export function getStreak() {
  return parseInt(localStorage.getItem(KEY_STREAK) || '0', 10);
}

export function getStreakTier() {
  const streak = getStreak();
  for (const tier of TIERS) {
    if (streak >= tier.days) return tier;
  }
  return TIERS[TIERS.length - 1];
}

export function getStreakMultiplier() {
  return getStreakTier().mult;
}
