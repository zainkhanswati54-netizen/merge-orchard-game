// ---------------------------------------------------------------------------
// MYSTERY SYSTEM — Secret Fruits, Hidden Guardians, Mystery Boxes
// ---------------------------------------------------------------------------
// Creates curiosity. Players always wonder "what's next?"
// ---------------------------------------------------------------------------

const KEY = 'legend_orchard_mysteries';

export const SECRET_FRUITS = [
  { id: 'rainbow_fruit', name: 'Rainbow Fruit', desc: 'A legendary fruit that can merge with anything!', rarity: 'legendary', chance: 0.005 },
  { id: 'golden_apple',  name: 'Golden Apple',  desc: 'Worth 10x points when merged!',                rarity: 'rare',      chance: 0.015 },
  { id: 'phantom_fruit', name: 'Phantom Fruit', desc: 'Passes through walls! Mysterious...',          rarity: 'rare',      chance: 0.012 },
  { id: 'bomb_fruit',    name: 'Bomb Fruit',    desc: 'Merges ALL adjacent same-tier fruits at once!',rarity: 'epic',     chance: 0.008 },
  { id: 'star_fruit',    name: 'Star Fruit',    desc: 'Grants bonus XP and coins when merged!',       rarity: 'uncommon',  chance: 0.02  },
];

export const MYSTERY_BOX_REWARDS = [
  { type: 'coins',      label: '+200 Coins',     value: 200,  weight: 30 },
  { type: 'coins',      label: '+500 Coins',     value: 500,  weight: 15 },
  { type: 'xp',         label: '+300 XP',        value: 300,  weight: 25 },
  { type: 'power',      label: 'Lightning Power', value: 'lightning', weight: 10 },
  { type: 'power',      label: 'Magnet Power',    value: 'magnet', weight: 10 },
  { type: 'secret_fruit', label: 'Rainbow Fruit!', value: 'rainbow_fruit', weight: 5 },
  { type: 'coins',      label: 'JACKPOT +2000!',  value: 2000, weight: 5  },
];

let _state = _load();

function _load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { discoveredSecrets: [], mysteryBoxesOpened: 0, rareFruitsFound: 0 };
  } catch(e) { return { discoveredSecrets: [], mysteryBoxesOpened: 0, rareFruitsFound: 0 }; }
}
function _save() { try { localStorage.setItem(KEY, JSON.stringify(_state)); } catch(e) {} }

export function rollForSecretFruit(chapterLevel = 1) {
  const bonusChance = chapterLevel * 0.0002;
  for (const fruit of SECRET_FRUITS) {
    if (Math.random() < fruit.chance + bonusChance) {
      return fruit;
    }
  }
  return null;
}

export function openMysteryBox() {
  _state.mysteryBoxesOpened++;
  _save();
  
  // Weighted random
  const total = MYSTERY_BOX_REWARDS.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const reward of MYSTERY_BOX_REWARDS) {
    roll -= reward.weight;
    if (roll <= 0) return reward;
  }
  return MYSTERY_BOX_REWARDS[0];
}

export function discoverSecret(id) {
  if (!_state.discoveredSecrets.includes(id)) {
    _state.discoveredSecrets.push(id);
    _save();
    return true; // newly discovered
  }
  return false;
}

export function getMysteryStats() {
  return { ..._state };
}

export function shouldSpawnMysteryBox(mergeCount) {
  // Mystery box appears every ~20 merges, with some randomness
  return mergeCount > 0 && mergeCount % 20 === 0 && Math.random() < 0.4;
}
