// ---------------------------------------------------------------------------
// CHAPTER SYSTEM — 150 Restoration Chapters
// ---------------------------------------------------------------------------
// The Eternal Orchard is divided into 150 chapters across 7 grand areas.
// Each chapter unlocks new land, story, mechanics and challenges.
// ---------------------------------------------------------------------------

const CHAPTER_KEY = 'legend_orchard_chapters';

// Grand Areas
export const ORCHARD_AREAS = [
  { id: 'forgotten_field',  name: 'The Forgotten Field', levels: [1,8],   color: '#4CAF50', desc: 'Where it all begins. The first fragment of the Eternal Orchard.' },
  { id: 'apple_grove',      name: 'Apple Grove',         levels: [9,18],  color: '#E53935', desc: 'Once the most beautiful grove. The Blight silenced the songbirds.' },
  { id: 'cherry_valley',    name: 'Cherry Valley',       levels: [19,28], color: '#C62828', desc: 'Where pink blossoms fell like snow. Now ash covers the petals.' },
  { id: 'golden_orchard',   name: 'Golden Orchard',      levels: [29,38], color: '#F57F17', desc: 'Golden light once ripened all fruit here. The sun forgot this place.' },
  { id: 'crystal_forest',   name: 'Crystal Forest',      levels: [39,44], color: '#7B1FA2', desc: 'Ancient magic crystallized the trees. Break the curse, restore the forest.' },
  { id: 'eternal_orchard',  name: 'Eternal Orchard',     levels: [45,50], color: '#2E7D32', desc: 'The heart of all orchards. Restore it, and save the world.' },
];

// Difficulty modifiers per chapter
export const CHAPTER_MODIFIERS = {
  none:          { label: 'Clear' },
  limited_drops: { label: 'Limited Drops', desc: 'Only 15 drops allowed!' },
  time_limit:    { label: 'Time Attack', desc: 'Score as much as possible in 90s!' },
  heavy_gravity: { label: 'Heavy Gravity', desc: 'Fruits fall faster — aim carefully!' },
  wind_storm:    { label: 'Wind Storm', desc: 'Strong winds push your fruits sideways!' },
  frozen_fruits: { label: 'Frozen', desc: 'Fruits freeze briefly on landing!' },
  dark_fruits:   { label: 'Dark Mode', desc: 'Fruits become invisible after landing!' },
  locked_fruits: { label: 'Locked', desc: 'Some fruits are locked — merge around them!' },
  fruit_decay:   { label: 'Fruit Decay', desc: 'Fruits slowly shrink — merge fast!' },
  mirror_mode:   { label: 'Mirror', desc: 'Controls are reversed!' },
  low_vis:       { label: 'Fog of War', desc: 'You can barely see the board!' },
  guardian_trial:{ label: 'Guardian Trial', desc: 'A Guardian tests your skills!' },
};

// Generate all 150 chapters
function _generateChapters() {
  const chapters = [];
  for (let i = 1; i <= 50; i++) {
    const area = ORCHARD_AREAS.find(a => i >= a.levels[0] && i <= a.levels[1]);
    const chapterInArea = i - area.levels[0] + 1;

    // Modifiers: only from chapter 10+, gentler rotation
    let modifier = 'none';
    if (i % 10 === 0) modifier = 'guardian_trial';
    else if (i >= 10 && i % 8 === 0) modifier = 'limited_drops';
    else if (i >= 15 && i % 9 === 0) modifier = 'time_limit';
    else if (i >= 20 && i % 11 === 0) modifier = 'wind_storm';
    else if (i >= 30 && i % 13 === 0) modifier = 'heavy_gravity';

    // ★ Easy, Achievable targets — 1-star is very doable, 3-star is satisfying challenge
    // Ch1: 300 / 600 / 1000. Ch50: ~2800 / 5600 / 9000
    const base1 = Math.round(300 + i * 50);               // 1-star: very easy
    const base2 = Math.round(base1 * 2.0);                // 2-star: moderate
    const base3 = Math.round(base1 * 3.2);                // 3-star: rewarding challenge
    const starsTarget = [base1, base2, base3];

    const hasStory = i % 5 === 0 || i === 1;
    const isBossLevel = i % 10 === 0;

    chapters.push({
      id: i,
      area: area.id,
      areaName: area.name,
      name: `Chapter ${i}`,
      chapterInArea,
      modifier,
      starsTarget,
      hasStory,
      isBossLevel,
      reward: {
        coins: 80 + i * 15,   // better rewards
        xp:   150 + i * 25,
      }
    });
  }
  return chapters;
}

export const ALL_CHAPTERS = _generateChapters();

// Player progress state
let _progress = _load();

function _load() {
  try {
    const raw = localStorage.getItem(CHAPTER_KEY);
    return raw ? JSON.parse(raw) : {
      currentChapter: 1,
      highestUnlocked: 1,
      chapterStars: {},    // chapterId -> 0-3 stars
      chapterBestScore: {}, // chapterId -> best score
    };
  } catch (e) {
    return { currentChapter: 1, highestUnlocked: 1, chapterStars: {}, chapterBestScore: {} };
  }
}

function _save() {
  try { localStorage.setItem(CHAPTER_KEY, JSON.stringify(_progress)); } catch(e) {}
}

export function getCurrentChapter() {
  return ALL_CHAPTERS.find(c => c.id === _progress.currentChapter) || ALL_CHAPTERS[0];
}

export function getHighestUnlockedChapter() {
  return _progress.highestUnlocked;
}

export function setCurrentChapter(id) {
  _progress.currentChapter = id;
  _save();
}

export function getChapterStars(id) {
  return _progress.chapterStars[id] || 0;
}

export function getChapterBestScore(id) {
  return _progress.chapterBestScore[id] || 0;
}

export function completeChapter(chapterId, score) {
  const chapter = ALL_CHAPTERS.find(c => c.id === chapterId);
  if (!chapter) return { stars: 0, isNew: false };

  // Calculate stars
  let stars = 0;
  if (score >= chapter.starsTarget[0]) stars = 1;
  if (score >= chapter.starsTarget[1]) stars = 2;
  if (score >= chapter.starsTarget[2]) stars = 3;

  const prevStars = _progress.chapterStars[chapterId] || 0;
  const prevBest = _progress.chapterBestScore[chapterId] || 0;
  const isNewBest = score > prevBest;

  if (stars > prevStars) _progress.chapterStars[chapterId] = stars;
  if (isNewBest) _progress.chapterBestScore[chapterId] = score;

  // Unlock next chapter
  if (stars > 0 && chapterId >= _progress.highestUnlocked) {
    _progress.highestUnlocked = Math.min(50, chapterId + 1);
  }

  _save();
  return { stars, prevStars, isNewBest, isNew: stars > prevStars };
}

export function getTotalStars() {
  return Object.values(_progress.chapterStars).reduce((a, b) => a + b, 0);
}

export function getAreaProgress(areaId) {
  const area = ORCHARD_AREAS.find(a => a.id === areaId);
  if (!area) return { completed: 0, total: 0, stars: 0 };
  const chapters = ALL_CHAPTERS.filter(c => c.area === areaId);
  const completed = chapters.filter(c => (_progress.chapterStars[c.id] || 0) > 0).length;
  const stars = chapters.reduce((sum, c) => sum + (_progress.chapterStars[c.id] || 0), 0);
  return { completed, total: chapters.length, stars, maxStars: chapters.length * 3 };
}

export function getOverallProgress() {
  const totalStars = getTotalStars();
  const completedChapters = Object.values(_progress.chapterStars).filter(s => s > 0).length;
  return {
    completedChapters,
    totalChapters: 50,
    totalStars,
    maxStars: 150,
    percentage: Math.round((completedChapters / 50) * 100),
  };
}

export function isChapterUnlocked(chapterId) {
  return chapterId <= _progress.highestUnlocked;
}
