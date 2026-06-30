// ---------------------------------------------------------------------------
// GUARDIAN MANAGER (formerly Boss Manager)
// ---------------------------------------------------------------------------
// The Legendary Guardians of the Eternal Orchard. They vanished when The Blight
// struck and must be awakened through special merges. Each Guardian restores
// a piece of the Eternal Orchard.
// ---------------------------------------------------------------------------

import { getLevelInfo } from './xp.js';

const BOSS_DEFS = [
  {
    id: 'apple_guardian',
    name: 'Apple Guardian',
    color: '#8BC34A',
    level: 10,
    desc: 'Guardian of the Apple Grove. Awakens when enough Life Energy is gathered in the Forgotten Field.',
    power: 'Fruit Magnet — draws same-tier fruits together.',
    area: 'The Apple Grove',
    hpRequired: 5,
    reward: { xp: 500, coins: 300 },
    callout: 'APPLE GUARDIAN AWAKENS! The grove blooms!',
  },
  {
    id: 'cherry_guardian',
    name: 'Cherry Guardian',
    color: '#D7263D',
    level: 20,
    desc: 'Guardian of Cherry Valley. Slept beneath the petals for centuries, waiting for the Keeper.',
    power: 'Double XP — all life energy gained is doubled.',
    area: 'Cherry Valley',
    hpRequired: 8,
    reward: { xp: 1200, coins: 700 },
    callout: 'CHERRY GUARDIAN AWAKENS! The valley blooms!',
  },
  {
    id: 'orange_guardian',
    name: 'Orange Guardian',
    color: '#FF8C42',
    level: 30,
    desc: 'Guardian of the Golden Orchard. Commands the golden light that ripens all fruit.',
    power: 'Golden Fruit Chance — rare golden fruits appear with bonus points.',
    area: 'Golden Orchard',
    hpRequired: 12,
    reward: { xp: 2500, coins: 1500 },
    callout: 'ORANGE GUARDIAN AWAKENS! The golden light returns!',
  },
  {
    id: 'pear_guardian',
    name: 'Pear Guardian',
    color: '#C8E6C9',
    level: 40,
    desc: 'Guardian of the Crystal Forest. Master of time — the Blight could not touch their domain.',
    power: 'Slow Time — everything moves at half speed for a brief moment.',
    area: 'Crystal Forest',
    hpRequired: 18,
    reward: { xp: 5000, coins: 3000 },
    callout: 'PEAR GUARDIAN AWAKENS! Time flows freely again!',
  },
  {
    id: 'crystal_guardian',
    name: 'Crystal Guardian',
    color: '#B39DDB',
    level: 50,
    desc: 'Guardian of the Sky Orchard. The most powerful guardian — imprisoned in crystal by the Blight itself.',
    power: 'Merge Blast — triggers a chain reaction across all matching fruits.',
    area: 'Sky Orchard',
    hpRequired: 25,
    reward: { xp: 8000, coins: 5000 },
    callout: 'CRYSTAL GUARDIAN AWAKENS! The sky islands rise again!',
  },
  {
    id: 'tree_of_life',
    name: 'Tree of Life Guardian',
    color: '#66BB6A',
    level: 60,
    desc: 'The ancient Tree of Life itself. The original source of all magic. The final guardian.',
    power: 'Legendary Orchard Mode — the Eternal Orchard is fully restored!',
    area: 'The Eternal Orchard',
    hpRequired: 35,
    reward: { xp: 20000, coins: 12000 },
    callout: 'THE TREE OF LIFE AWAKENS! THE ETERNAL ORCHARD IS RESTORED!',
  },
];

const KEY_BOSS_STATE = 'merge_boss_state';

let _state = _loadState();
const _listeners = [];

function _loadState() {
  try {
    const raw = localStorage.getItem(KEY_BOSS_STATE);
    return raw ? JSON.parse(raw) : { defeatedBossIds: [], currentBossId: null, currentHP: 0 };
  } catch (e) {
    return { defeatedBossIds: [], currentBossId: null, currentHP: 0 };
  }
}

function _saveState() {
  try {
    localStorage.setItem(KEY_BOSS_STATE, JSON.stringify(_state));
  } catch (e) {}
}

export function getBossForLevel(level) {
  for (let i = BOSS_DEFS.length - 1; i >= 0; i--) {
    const boss = BOSS_DEFS[i];
    if (boss.level <= level && !_state.defeatedBossIds.includes(boss.id)) {
      return boss;
    }
  }
  return null;
}

export function getActiveBoss() {
  if (!_state.currentBossId) return null;
  return BOSS_DEFS.find((b) => b.id === _state.currentBossId) || null;
}

export function getCurrentBossHP() {
  return _state.currentHP;
}

export function startBoss(bossId) {
  const boss = BOSS_DEFS.find((b) => b.id === bossId);
  if (!boss) return;
  _state.currentBossId = bossId;
  _state.currentHP = boss.hpRequired;
  _saveState();
  for (const fn of _listeners) fn({ type: 'start', boss, hp: _state.currentHP });
}

export function hitBoss() {
  const boss = getActiveBoss();
  if (!boss) return null;

  _state.currentHP = Math.max(0, _state.currentHP - 1);
  _saveState();

  if (_state.currentHP === 0) {
    _state.defeatedBossIds.push(boss.id);
    _state.currentBossId = null;
    _saveState();
    for (const fn of _listeners) fn({ type: 'defeated', boss });
    return { defeated: true, boss };
  }

  for (const fn of _listeners) fn({ type: 'hit', boss, hp: _state.currentHP });
  return { defeated: false, boss, remainingHP: _state.currentHP };
}

export function checkAndStartBossForCurrentLevel() {
  if (_state.currentBossId) return getActiveBoss();

  const { level } = getLevelInfo();
  const boss = getBossForLevel(level);
  if (boss) {
    startBoss(boss.id);
    return boss;
  }
  return null;
}

export function isBossActive() {
  return !!_state.currentBossId;
}

export function getDefeatedCount() {
  return _state.defeatedBossIds.length;
}

export function onBossEvent(fn) {
  _listeners.push(fn);
}

export function getAllBosses() {
  return BOSS_DEFS;
}

export function isBossDefeated(id) {
  return _state.defeatedBossIds.includes(id);
}

// Returns how many guardians have been awakened (for restoration progress)
export function getGuardianProgress() {
  return {
    awakened: _state.defeatedBossIds.length,
    total: BOSS_DEFS.length,
  };
}
