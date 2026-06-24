// ---------------------------------------------------------------------------
// CHAPTER SYSTEM — 150 Restoration Chapters
// ---------------------------------------------------------------------------
// The Eternal Orchard is divided into 150 chapters across 7 grand areas.
// Each chapter unlocks new land, story, mechanics and challenges.
// ---------------------------------------------------------------------------

const CHAPTER_KEY = 'legend_orchard_chapters';

// Grand Areas
export const ORCHARD_AREAS = [
  { id: 'forgotten_field',  name: 'The Forgotten Field', levels: [1,10],   icon: '🌱', color: '#4CAF50', desc: 'Where it all begins. The first fragment of the Eternal Orchard.' },
  { id: 'apple_grove',      name: 'Apple Grove',         levels: [11,25],  icon: '🍎', color: '#E53935', desc: 'Once the most beautiful grove. The Blight silenced the songbirds.' },
  { id: 'cherry_valley',    name: 'Cherry Valley',       levels: [26,50],  icon: '🍒', color: '#C62828', desc: 'Where pink blossoms fell like snow. Now ash covers the petals.' },
  { id: 'golden_orchard',   name: 'Golden Orchard',      levels: [51,75],  icon: '🍊', color: '#F57F17', desc: 'Golden light once ripened all fruit here. The sun forgot this place.' },
  { id: 'crystal_forest',   name: 'Crystal Forest',      levels: [76,100], icon: '💎', color: '#7B1FA2', desc: 'Ancient magic crystallized the trees. Break the curse, restore the forest.' },
  { id: 'sky_orchard',      name: 'Sky Orchard',         levels: [101,125],icon: '☁️', color: '#0288D1', desc: 'Floating islands rose above the Blight. Wind and danger at every drop.' },
  { id: 'eternal_orchard',  name: 'Eternal Orchard',     levels: [126,150],icon: '🌳', color: '#2E7D32', desc: 'The heart of all orchards. Restore it, and save the world.' },
];

// Difficulty modifiers per chapter
export const CHAPTER_MODIFIERS = {
  none:          { label: 'Clear',         icon: '☀️' },
  limited_drops: { label: 'Limited Drops', icon: '⏳', desc: 'Only 15 drops allowed!' },
  time_limit:    { label: 'Time Attack',   icon: '⏱️', desc: 'Score as much as possible in 90s!' },
  heavy_gravity: { label: 'Heavy Gravity', icon: '⬇️', desc: 'Fruits fall faster — aim carefully!' },
  wind_storm:    { label: 'Wind Storm',    icon: '💨', desc: 'Strong winds push your fruits sideways!' },
  frozen_fruits: { label: 'Frozen',        icon: '❄️', desc: 'Fruits freeze briefly on landing!' },
  dark_fruits:   { label: 'Dark Mode',     icon: '🌑', desc: 'Fruits become invisible after landing!' },
  locked_fruits: { label: 'Locked',        icon: '🔒', desc: 'Some fruits are locked — merge around them!' },
  fruit_decay:   { label: 'Fruit Decay',   icon: '💀', desc: 'Fruits slowly shrink — merge fast!' },
  mirror_mode:   { label: 'Mirror',        icon: '🪞', desc: 'Controls are reversed!' },
  low_vis:       { label: 'Fog of War',    icon: '🌫️', desc: 'You can barely see the board!' },
  guardian_trial:{ label: 'Guardian Trial',icon: '⚔️', desc: 'A Guardian tests your skills!' },
};

// Generate all 150 chapters
function _generateChapters() {
  const chapters = [];
  for (let i = 1; i <= 150; i++) {
    const area = ORCHARD_AREAS.find(a => i >= a.levels[0] && i <= a.levels[1]);
    const chapterInArea = i - area.levels[0] + 1;
    
    // Determine difficulty modifier
    let modifier = 'none';
    if (i % 10 === 0) modifier = 'guardian_trial';
    else if (i >= 11 && i % 7 === 0) modifier = 'limited_drops';
    else if (i >= 21 && i % 8 === 0) modifier = 'time_limit';
    else if (i >= 31 && i % 6 === 0) modifier = 'wind_storm';
    else if (i >= 41 && i % 9 === 0) modifier = 'heavy_gravity';
    else if (i >= 51 && i % 11 === 0) modifier = 'frozen_fruits';
    else if (i >= 61 && i % 13 === 0) modifier = 'dark_fruits';
    else if (i >= 76 && i % 7 === 0) modifier = 'fruit_decay';
    else if (i >= 101 && i % 8 === 0) modifier = 'mirror_mode';
    else if (i >= 126 && i % 6 === 0) modifier = 'low_vis';

    // Score target scales with chapter
    const baseTarget = 500 + (i * 80);
    const starsTarget = [baseTarget, baseTarget * 1.5, baseTarget * 2.2];

    // Story unlock every 5 levels
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
      // Reward scales with chapter
      reward: {
        coins: 50 + i * 10,
        xp: 100 + i * 20,
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
    _progress.highestUnlocked = Math.min(150, chapterId + 1);
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
    totalChapters: 150,
    totalStars,
    maxStars: 450,
    percentage: Math.round((completedChapters / 150) * 100),
  };
}

export function isChapterUnlocked(chapterId) {
  return chapterId <= _progress.highestUnlocked;
}
