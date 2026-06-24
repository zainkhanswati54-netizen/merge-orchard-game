// ---------------------------------------------------------------------------
// SPECIAL POWERS SYSTEM — Now costs Life Energy, not coins
// ---------------------------------------------------------------------------
// Each power costs Life Energy. Player must decide carefully.
// Powers that fail to find targets waste energy + add Blight.
// ---------------------------------------------------------------------------

import { CONFIG } from './config.js';
import { spendEnergy, canAffordEnergy } from './lifeEnergy.js';
import { blightOnWastedPower } from './blightSystem.js';

export const POWER_DEFS = [
  {
    id: 'magnet',
    name: 'Fruit Magnet',
    emoji: '🧲',
    desc: 'Pulls matching fruits together for 5 seconds.',
    energyCost: 10,
    cooldownMs: 0,
    story: 'The Guardian\'s magnetic pull draws kindred fruits together.',
  },
  {
    id: 'freeze',
    name: 'Freeze',
    emoji: '❄️',
    desc: 'Stops all movement for 6 seconds.',
    energyCost: 15,
    cooldownMs: 0,
    story: 'Ancient ice magic halts the Blight\'s chaos.',
  },
  {
    id: 'rainbow',
    name: 'Rainbow Fruit',
    emoji: '🌈',
    desc: 'Next dropped fruit matches anything.',
    energyCost: 25,
    cooldownMs: 0,
    story: 'A miracle fruit born from the Orchard\'s pure heart.',
  },
  {
    id: 'lightning',
    name: 'Lightning',
    emoji: '⚡',
    desc: 'Instantly merges a random matching pair.',
    energyCost: 30,
    cooldownMs: 0,
    story: 'Sky Orchard energy strikes — merging fruits by force.',
  },
  {
    id: 'bomb',
    name: 'Legendary Power',
    emoji: '🌟',
    desc: 'Purifies 4 corrupted fruits from the board.',
    energyCost: 50,
    cooldownMs: 0,
    story: 'The Ancient Roots awaken — corruption cannot stand.',
  },
];

// Persistent power inventory stored in localStorage
let inventory = _loadInventory();

function _loadInventory() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY_POWERS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function _saveInventory() {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY_POWERS, JSON.stringify(inventory));
  } catch (e) {/* ignore */}
}

export function getPowerCount(id) {
  return inventory[id] || 0;
}

export function addPower(id, count = 1) {
  inventory[id] = (inventory[id] || 0) + count;
  _saveInventory();
}

export function getPowerEnergyCost(id) {
  const def = POWER_DEFS.find((p) => p.id === id);
  return def ? def.energyCost : 0;
}

// Returns false if not enough Life Energy
export function usePower(id) {
  const def = POWER_DEFS.find((p) => p.id === id);
  if (!def) return false;
  if (!inventory[id] || inventory[id] <= 0) return false;
  if (!canAffordEnergy(def.energyCost)) return false;
  if (!spendEnergy(def.energyCost)) return false;
  inventory[id]--;
  _saveInventory();
  return true;
}

// Power failed to find a target — waste penalty
export function reportPowerWasted() {
  blightOnWastedPower();
}

// Buy power with coins (from shop)
export function buyPower(id) {
  // Powers now earned through gameplay/chapters, not bought with coins
  // But keep for legacy shop support
  addPower(id);
  return true;
}
