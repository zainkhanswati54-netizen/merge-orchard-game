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
    emoji: '🧲',
    desc: 'See the next 2 incoming fruits instead of 1.',
    type: 'passive',
  },
  {
    level: 10,
    id: 'double_xp_boost',
    name: 'Double XP',
    emoji: '⭐',
    desc: 'Every 10th merge gives 2x XP.',
    type: 'passive',
  },
  {
    level: 15,
    id: 'slow_motion',
    name: 'Slow Drop',
    emoji: '🕐',
    desc: 'Fruits fall 15% slower, giving you more time to aim.',
    type: 'passive',
  },
  {
    level: 20,
    id: 'combo_saver',
    name: 'Combo Saver',
    emoji: '🛡️',
    desc: 'Combo window extended by 200ms.',
    type: 'passive',
  },
  {
    level: 25,
    id: 'precision_drop',
    name: 'Precision Drop',
    emoji: '🎯',
    desc: 'Dropper moves 20% faster for precise placement.',
    type: 'passive',
  },
  {
    level: 30,
    id: 'fruit_evolution',
    name: 'Fruit Evolution',
    emoji: '🌱',
    desc: 'Rare chance (5%) for a fruit to evolve to next tier on drop.',
    type: 'passive',
  },
  {
    level: 40,
    id: 'coin_storm',
    name: 'Coin Storm',
    emoji: '🪙',
    desc: 'Coins earned per merge increased by 25%.',
    type: 'passive',
  },
  {
    level: 50,
    id: 'golden_spawn',
    name: 'Golden Fruit Spawn',
    emoji: '✨',
    desc: 'Rare golden fruits appear that give 5x XP on merge.',
    type: 'passive',
  },
  {
    level: 75,
    id: 'merge_blast',
    name: 'Merge Blast',
    emoji: '💥',
    desc: 'Max-tier merges send a shockwave that nudges nearby fruits.',
    type: 'passive',
  },
  {
    level: 100,
    id: 'phoenix_fruit',
    name: 'Phoenix Fruit',
    emoji: '🔥',
    desc: 'Once per game, if you game-over, a Phoenix Fruit saves you!',
    type: 'active',
  },
  {
    level: 125,
    id: 'time_freeze_plus',
    name: 'Time Freeze+',
    emoji: '❄️',
    desc: 'Freeze power duration doubled to 12 seconds.',
    type: 'passive',
  },
  {
    level: 150,
    id: 'orchard_master',
    name: 'Orchard Master',
    emoji: '👑',
    desc: 'All bonuses doubled. You are the ultimate master of the orchard!',
    type: 'passive',
  },
];

const KEY_NOTIFIED = 'merge_skills_notified';

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
    hasPhoenix: isSkillUnlocked('phoenix_fruit'),
    hasGoldenSpawn: isSkillUnlocked('golden_spawn'),
    hasMergeBlast: isSkillUnlocked('merge_blast'),
    gravityScale: isSkillUnlocked('slow_motion') ? 0.85 : 1,
    masterBonus,
  };
}
