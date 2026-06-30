// ===========================================================================
// MISSION SELECT SYSTEM v2
// - Missions unlock one by one (sequential)
// - 1 star = chapter complete = next chapter unlocks
// - Stars: 1 mission = 0.5★, 3 = 1★, 7 = 2★, 15 = 3★
// ===========================================================================

const MISSION_STORE_KEY = 'legend_mission_v2';

// Pool of mission templates
const MISSION_POOL = [
  { type:'score',      key:'score_1',   label:'Orchard Bloom',      icon:'🌸', desc:'Score {n} points',               scaleFn:(c)=>200+c*40,  xpBase:80,  coinBase:30  },
  { type:'merge',      key:'merge_1',   label:'Gentle Merger',      icon:'✨', desc:'Merge {n} fruits',               scaleFn:(c)=>10+c*2,    xpBase:70,  coinBase:25  },
  { type:'drop',       key:'drop_1',    label:'Fruit Shower',       icon:'🌧️', desc:'Drop {n} fruits',                scaleFn:(c)=>15+c*2,    xpBase:60,  coinBase:20  },
  { type:'combo',      key:'combo_1',   label:'Chain Starter',      icon:'🔗', desc:'Get a Combo x{n}',               scaleFn:(c)=>2,         xpBase:90,  coinBase:35  },
  { type:'score',      key:'score_2',   label:'Fruit Feast',        icon:'🍊', desc:'Score {n} points',               scaleFn:(c)=>500+c*80,  xpBase:120, coinBase:50  },
  { type:'merge',      key:'merge_2',   label:'Fusion Master',      icon:'💥', desc:'Merge {n} fruits',               scaleFn:(c)=>25+c*4,    xpBase:110, coinBase:45  },
  { type:'combo',      key:'combo_2',   label:'Chain Builder',      icon:'🔥', desc:'Get a Combo x{n}',               scaleFn:(c)=>3+Math.floor(c/8), xpBase:130, coinBase:55 },
  { type:'drop',       key:'drop_2',    label:'Rain of Fruit',      icon:'⛈️', desc:'Drop {n} fruits',                scaleFn:(c)=>30+c*4,    xpBase:100, coinBase:40  },
  { type:'score',      key:'score_3',   label:'Grand Harvest',      icon:'🏆', desc:'Score {n} points in one game',   scaleFn:(c)=>900+c*150, xpBase:180, coinBase:70  },
  { type:'dangerMerge',key:'danger_1',  label:'Edge Walker',        icon:'⚠️', desc:'Make {n} danger-zone merges',    scaleFn:(c)=>2+Math.floor(c/6), xpBase:150, coinBase:60 },
  { type:'merge',      key:'merge_3',   label:'Merge Storm',        icon:'⚡', desc:'Merge {n} fruits in one game',   scaleFn:(c)=>40+c*6,    xpBase:160, coinBase:65  },
  { type:'coins',      key:'coins_1',   label:'Coin Collector',     icon:'🪙', desc:'Earn {n} coins in a game',       scaleFn:(c)=>20+c*5,    xpBase:130, coinBase:50  },
  { type:'combo',      key:'combo_3',   label:'Chain Master',       icon:'💫', desc:'Get a Combo x{n}!',              scaleFn:(c)=>4+Math.floor(c/5), xpBase:200, coinBase:80 },
  { type:'score',      key:'score_4',   label:'Elite Scorer',       icon:'⭐', desc:'Score {n} points in one game',   scaleFn:(c)=>1500+c*200, xpBase:240, coinBase:100 },
  { type:'dangerMerge',key:'danger_2',  label:'Thrill Seeker',      icon:'💀', desc:'Make {n} danger-zone merges!',   scaleFn:(c)=>5+Math.floor(c/4), xpBase:220, coinBase:90 },
  { type:'bigMerge',   key:'big_1',     label:'Watermelon Dream',   icon:'🍉', desc:'Create a Watermelon (tier 6+)',  scaleFn:(c)=>6,         xpBase:280, coinBase:110 },
  { type:'coins',      key:'coins_2',   label:'Gold Rush',          icon:'💰', desc:'Earn {n} coins in a game',       scaleFn:(c)=>60+c*12,   xpBase:250, coinBase:100 },
  { type:'noPower',    key:'nopower_1', label:'Pure Skill',         icon:'🧘', desc:'Score {n}+ without using powers', scaleFn:(c)=>400+c*70, xpBase:300, coinBase:120 },
  { type:'score',      key:'score_5',   label:'Legendary Harvest',  icon:'👑', desc:'Score {n} points in one game',   scaleFn:(c)=>2000+c*300, xpBase:350, coinBase:140 },
  { type:'bigMerge',   key:'big_2',     label:'Giant Lord',         icon:'🌍', desc:'Create a fruit of tier 7+',      scaleFn:(c)=>7,         xpBase:400, coinBase:160 },
];

// Build 20 missions for a chapter — same order every time (deterministic)
function _buildChapterMissions(chapterId) {
  return MISSION_POOL.map((t, i) => {
    const target = Math.max(1, Math.round(t.scaleFn(chapterId)));
    const xp     = Math.round(t.xpBase * (1 + chapterId * 0.15));
    const coins  = Math.round(t.coinBase * (1 + chapterId * 0.12));
    const diff   = i < 7 ? 'easy' : i < 14 ? 'medium' : 'hard';
    return {
      id:         `c${chapterId}_m${i+1}`,
      chapterId,
      missionNum: i + 1,
      type:       t.type,
      key:        t.key,
      label:      t.label,
      icon:       t.icon,
      desc:       t.desc.replace('{n}', target),
      target,
      difficulty: diff,
      xpReward:   xp,
      coinReward: coins,
    };
  });
}

// --- Persistence ---
let _store = _load();

function _load() {
  try {
    const raw = localStorage.getItem(MISSION_STORE_KEY);
    return raw ? JSON.parse(raw) : {
      progress:  {},   // missionId -> number
      completed: {},   // missionId -> true
      unlocked:  {},   // chapterId -> highestUnlockedMissionNum (1-based)
    };
  } catch(e) {
    return { progress:{}, completed:{}, unlocked:{} };
  }
}

function _save() {
  try { localStorage.setItem(MISSION_STORE_KEY, JSON.stringify(_store)); } catch(e) {}
}

// Highest unlocked mission index for a chapter (1 = first unlocked)
function _getUnlocked(chapterId) {
  return _store.unlocked[chapterId] || 1;
}

// --- Public API ---

export function getChapterMissions(chapterId) {
  const all = _buildChapterMissions(chapterId);
  const unlocked = _getUnlocked(chapterId);
  return all.map((m, i) => ({
    ...m,
    progress:  _store.progress[m.id] || 0,
    completed: !!_store.completed[m.id],
    isUnlocked: (i + 1) <= unlocked,
    isNext:     (i + 1) === unlocked && !_store.completed[m.id],
  }));
}

export function getActiveMission() {
  try {
    const raw = localStorage.getItem('legend_active_mission_v2');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

export function setActiveMission(mission) {
  try {
    if (mission) localStorage.setItem('legend_active_mission_v2', JSON.stringify(mission));
    else localStorage.removeItem('legend_active_mission_v2');
  } catch(e) {}
}

// Track mission progress — called from game events
export function trackMissionProgress(type, amount, extraData = {}) {
  const active = getActiveMission();
  if (!active) return false;

  let progress = _store.progress[active.id] || 0;
  let matched = false;

  if (active.type === type) {
    if (type === 'score' || type === 'noPower') {
      // track max score this session
      const cur = _store.progress[active.id + '_max'] || 0;
      const newMax = Math.max(cur, amount);
      _store.progress[active.id + '_max'] = newMax;
      progress = newMax;
      matched = true;
    } else if (type === 'combo') {
      progress = Math.max(progress, amount);
      matched = true;
    } else if (type === 'bigMerge') {
      if (extraData.tier && extraData.tier >= active.target) {
        progress = active.target;
        matched = true;
      }
    } else {
      progress += amount;
      matched = true;
    }
  }

  if (!matched) return false;

  _store.progress[active.id] = progress;

  if (progress >= active.target && !_store.completed[active.id]) {
    _store.completed[active.id] = true;
    // Unlock next mission
    const cur = _store.unlocked[active.chapterId] || 1;
    _store.unlocked[active.chapterId] = Math.min(20, cur + 1);
    _save();
    return 'completed';
  }

  _save();
  return 'progress';
}

export function getMissionProgress(missionId) {
  return Math.max(
    _store.progress[missionId] || 0,
    _store.progress[missionId + '_max'] || 0
  );
}

export function isMissionCompleted(missionId) {
  return !!_store.completed[missionId];
}

// Stars: based on missions completed
// 3 done=0.5★, 7=1★, 14=2★, 20=3★
export function getMissionStars(chapterId) {
  const all = _buildChapterMissions(chapterId);
  const done = all.filter(m => _store.completed[m.id]).length;
  if (done >= 20) return 3;
  if (done >= 14) return 2;  // 2 stars = unlock next chapter
  if (done >= 7)  return 1;
  return 0;
}

// 2 stars = next chapter unlocks
export function isChapterCleared(chapterId) {
  return getMissionStars(chapterId) >= 2;
}

export function getChapterMissionStats(chapterId) {
  const all = _buildChapterMissions(chapterId);
  const done = all.filter(m => _store.completed[m.id]).length;
  return { total: 20, done, unlocked: _getUnlocked(chapterId) };
}

export function getDifficultyColor(diff) {
  return diff === 'easy' ? '#4CAF50' : diff === 'medium' ? '#FF9800' : '#F44336';
}
