// ---------------------------------------------------------------------------
// COIN CURRENCY SYSTEM
// ---------------------------------------------------------------------------
// Coins are earned per merge and per daily mission/achievement. They are
// a separate currency from XP — XP drives level progression and orchard
// unlocks, while coins are for purchasing powers and cosmetics.
// ---------------------------------------------------------------------------

import { CONFIG } from './config.js';

let totalCoins = _loadCoins();
const coinListeners = [];

function _loadCoins() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY_COINS);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch (e) {
    return 0;
  }
}

function _saveCoins(value) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY_COINS, String(value));
  } catch (e) {/* ignore */}
}

export function getTotalCoins() {
  return totalCoins;
}

export function addCoins(amount) {
  if (amount <= 0) return totalCoins;
  totalCoins += amount;
  _saveCoins(totalCoins);
  for (const fn of coinListeners) fn(totalCoins, amount);
  return totalCoins;
}

export function spendCoins(amount) {
  if (amount > totalCoins) return false;
  totalCoins -= amount;
  _saveCoins(totalCoins);
  for (const fn of coinListeners) fn(totalCoins, -amount);
  return true;
}

export function onCoinsChange(fn) {
  coinListeners.push(fn);
}

// How many coins a merge of a given score is worth.
// Higher tier merges are more rewarding.
export function coinsForMerge(scoreGain, riskBonus = false) {
  const base = Math.max(1, Math.ceil(scoreGain / 5));
  return riskBonus ? base * 2 : base;
}
