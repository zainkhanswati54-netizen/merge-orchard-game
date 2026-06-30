// ---------------------------------------------------------------------------
// SKILL TREE — Level Power Unlocks
// ---------------------------------------------------------------------------
// Every 5 levels unlocks a passive skill or active power perk.
// Skills are PASSIVE bonuses (different from the purchasable powers).
// ---------------------------------------------------------------------------

import { getLevelInfo } from './xp.js';

const SKILL_DEFS = [
  {
    level: 5,
    id: 'fruit_magnet_passive',
    name: 'Fruit Sense',
    desc: 'See the next 2 incoming fruits instead of 1.',
    type: 'passive',
  },
  {
    level: 10,
    id: 'double_xp_boost',
    name: 'Double XP',
    desc: 'Every 10th merge gives 2x XP.',
    type: 'passive',
  },
  {
    level: 15,
    id: 'slow_motion',
    name: 'Slow Drop',
    desc: 'Fruits fall 15% slower, giving you more time to aim.',
    type: 'passive',
  },
  {
    level: 20,
    id: 'combo_saver',
    name: 'Combo Saver',
    desc: 'Combo window extended by 200ms.',
    type: 'passive',
  },
  {
    level: 25,
    id: 'precision_drop',
    name: 'Precision Drop',
    desc: 'Dropper moves 20% faster for precise placement.',
    type: 'passive',
  },
  {
    level: 30,
    id: 'fruit_evolution',
    name: 'Fruit Evolution',
    desc: 'Rare chance (5%) for a fruit to evolve to next tier on drop.',
    type: 'passive',
  },
  {
    level: 40,
    id: 'coin_storm',
    name: 'Coin Storm',
    desc: 'Coins earned per merge increased by 25%.',
    type: 'passive',
  },
  {
    level: 50,
    id: 'golden_spawn',
    name: 'Golden Fruit Spawn',
    desc: 'Rare golden fruits appear that give 5x XP on merge.',
    type: 'passive',
  },
  {
    level: 75,
    id: 'merge_blast',
    name: 'Merge Blast',
    desc: 'Max-tier merges send a shockwave that nudges nearby fruits.',
    type: 'passive',
  },
  {
    level: 100,
    id: 'phoenix_fruit',
    name: 'Phoenix Fruit',
    desc: 'Once in your entire orchard journey, if you\'re about to game-over, a Phoenix Fruit saves you. After that, you\'re on your own!',
    type: 'active',
  },
  {
    level: 125,
    id: 'magnet_plus',
    name: 'Magnet+',
    desc: 'Magnet power pull is stronger and lasts 2 extra seconds.',
    type: 'passive',
  },
  {
    level: 150,
    id: 'orchard_master',
    name: 'Orchard Master',
    desc: 'All bonuses doubled. You are the ultimate master of the orchard!',
    type: 'passive',
  },
];

const KEY_NOTIFIED = 'merge_skills_notified';
const KEY_PHOENIX_USED = 'legend_orchard_phoenix_used';

let _notified = _loadNotified();

function _loadNotified() {
  try {
    const raw = localStorage.getItem(KEY_NOTIFIED);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function _saveNotified() {
  try {
    localStorage.setItem(KEY_NOTIFIED, JSON.stringify([..._notified]));
  } catch (e) {}
}

// Phoenix Fruit is a lifetime-once save, not a per-game freebie — once
// you've been rescued by it a single time across your whole save file,
// it never triggers again. This stays in its own small persisted flag
// rather than per-game state, precisely so restarting a run can't be
// used to "refill" it.
export function hasUsedPhoenix() {
  try {
    return localStorage.getItem(KEY_PHOENIX_USED) === '1';
  } catch (e) {
    return false;
  }
}

export function markPhoenixUsed() {
  try {
    localStorage.setItem(KEY_PHOENIX_USED, '1');
  } catch (e) {}
}

export function getAllSkills() {
  return SKILL_DEFS;
}

export function getUnlockedSkills() {
  const { level } = getLevelInfo();
  return SKILL_DEFS.filter((s) => s.level <= level);
}

export function getLockedSkills() {
  const { level } = getLevelInfo();
  return SKILL_DEFS.filter((s) => s.level > level);
}

export function getNextSkill() {
  const { level } = getLevelInfo();
  return SKILL_DEFS.find((s) => s.level > level) || null;
}

export function isSkillUnlocked(id) {
  const skill = SKILL_DEFS.find((s) => s.id === id);
  if (!skill) return false;
  const { level } = getLevelInfo();
  return level >= skill.level;
}

// Returns newly unlocked skills since last check (for notifications)
export function checkNewlyUnlockedSkills(prevLevel, newLevel) {
  const newSkills = [];
  for (const skill of SKILL_DEFS) {
    if (skill.level > prevLevel && skill.level <= newLevel && !_notified.has(skill.id)) {
      newSkills.push(skill);
      _notified.add(skill.id);
    }
  }
  if (newSkills.length) _saveNotified();
  return newSkills;
}

// Returns active passive modifiers based on unlocked skills
export function getSkillModifiers() {
  const { level } = getLevelInfo();
  const masterBonus = level >= 150 ? 2 : 1;

  return {
    coinMultiplier: (isSkillUnlocked('coin_storm') ? 1.25 : 1) * masterBonus,
    comboWindowBonus: isSkillUnlocked('combo_saver') ? 200 : 0,
    dropSpeedMult: isSkillUnlocked('precision_drop') ? 1.2 : 1,
    evolutionChance: isSkillUnlocked('fruit_evolution') ? 0.05 : 0,
    hasPhoenix: isSkillUnlocked('phoenix_fruit') && !hasUsedPhoenix(),
    hasGoldenSpawn: isSkillUnlocked('golden_spawn'),
    hasMergeBlast: isSkillUnlocked('merge_blast'),
    hasMagnetPlus: isSkillUnlocked('magnet_plus'),
    gravityScale: isSkillUnlocked('slow_motion') ? 0.85 : 1,
    masterBonus,
  };
}
