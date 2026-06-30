// ---------------------------------------------------------------------------
// ORCHARDS — The fragments of the Eternal Orchard
// ---------------------------------------------------------------------------
// Each orchard is a shattered fragment of the Eternal Orchard.
// Merging fruits generates Life Energy that restores each area.
// ---------------------------------------------------------------------------

export const THEMES = [
  {
    id: 'classic',
    name: 'Classic Orchard',
    unlockXP: 0,
    description: 'The Forgotten Field — the first fragment to restore. Tiny seeds to the legendary Eternal Pumpkin.',
    droppableCount: 3,
    weather: 'none',
    tiers: [
      { kind: 'seed',       name: 'Seed',       radius: 14, color: '#C9A876', shade: '#8E7347', score: 1  },
      { kind: 'cherry',     name: 'Cherry',     radius: 19, color: '#D7263D', shade: '#A11A2B', score: 2  },
      { kind: 'strawberry', name: 'Strawberry', radius: 28, color: '#FF4D6D', shade: '#C73A55', score: 4  },
      { kind: 'orange',     name: 'Orange',     radius: 39, color: '#FF8C42', shade: '#D9701F', score: 7  },
      { kind: 'apple',      name: 'Apple',      radius: 52, color: '#8BC34A', shade: '#5E8F2B', score: 13 },
      { kind: 'watermelon', name: 'Watermelon', radius: 70, color: '#2E8B57', shade: '#1F6740', score: 24 },
      { kind: 'goldenpear', name: 'Golden Pear', radius: 91, color: '#FFD23F', shade: '#D9A400', score: 42 },
      { kind: 'eternalpumpkin', name: 'Eternal Pumpkin', radius: 115, color: '#FF9F1C', shade: '#C46A00', score: 75 },
    ],
    modifiers: {
      boxWidthScale: 1,
      dropCooldownScale: 1,
      windStrength: 0,
    },
  },
  {
    id: 'cherry_valley',
    name: 'Cherry Valley',
    unlockXP: 200,
    description: 'Cherry Valley — once filled with song and blossom. The Blight silenced it.',
    droppableCount: 3,
    weather: 'none',
    tiers: [
      { kind: 'cherry',     name: 'Cherry',    radius: 18, color: '#FF3366', shade: '#CC1144', score: 2  },
      { kind: 'cherry',     name: 'Plum',      radius: 26, color: '#8E3AD4', shade: '#6622AA', score: 5  },
      { kind: 'orange',     name: 'Peach',     radius: 38, color: '#FFAE70', shade: '#E8883A', score: 9  },
      { kind: 'apple',      name: 'Nectarine', radius: 50, color: '#FF6B35', shade: '#D94F1A', score: 14 },
      { kind: 'watermelon', name: 'Pomelo',    radius: 68, color: '#FFD166', shade: '#E0AA30', score: 22 },
    ],
    modifiers: {
      boxWidthScale: 1,
      dropCooldownScale: 1.05,
      windStrength: 0,
    },
  },
  {
    id: 'tropical',
    name: 'Tropical Paradise',
    unlockXP: 500,
    description: 'Golden Orchard fragment — the sea breeze still carries the scent of mango.',
    droppableCount: 2,
    weather: 'none',
    tiers: [
      { kind: 'mango',       name: 'Mango',       radius: 24, color: '#FFB627', shade: '#E08E00', score: 2  },
      { kind: 'coconut',     name: 'Coconut',     radius: 36, color: '#8D6E4A', shade: '#5C4630', score: 5  },
      { kind: 'pineapple',   name: 'Pineapple',   radius: 50, color: '#FFD23F', shade: '#D9A400', score: 9  },
      { kind: 'dragonfruit', name: 'Dragonfruit', radius: 68, color: '#E0479E', shade: '#A8226F', score: 18 },
    ],
    modifiers: {
      boxWidthScale: 0.88,
      dropCooldownScale: 0.82,
      windStrength: 0.012,
    },
  },
  {
    id: 'mystic_forest',
    name: 'Mystic Forest',
    unlockXP: 900,
    description: 'The Crystal Forest — ancient magic lingers in glowing mushrooms and enchanted berries.',
    droppableCount: 3,
    weather: 'none',
    tiers: [
      { kind: 'blueberry', name: 'Spore',      radius: 16, color: '#7C4DFF', shade: '#5500DD', score: 2  },
      { kind: 'cherry',    name: 'Moonberry',  radius: 25, color: '#00E5FF', shade: '#009FB5', score: 5  },
      { kind: 'coconut',   name: 'Glowcap',    radius: 35, color: '#76FF03', shade: '#4CAE00', score: 8  },
      { kind: 'apple',     name: 'Dreamfruit', radius: 48, color: '#E040FB', shade: '#AA00CC', score: 13 },
      { kind: 'watermelon',name: 'Eldermelon', radius: 65, color: '#1DE9B6', shade: '#00AA7E', score: 21 },
    ],
    modifiers: {
      boxWidthScale: 0.94,
      dropCooldownScale: 0.9,
      windStrength: 0.004,
    },
  },
  {
    id: 'volcano',
    name: 'Volcano Orchard',
    unlockXP: 1500,
    description: 'The Blight burns hottest here. Scorching lava fruits guard what remains.',
    droppableCount: 2,
    weather: 'meteor',
    tiers: [
      { kind: 'cherry',    name: 'Ember',      radius: 16, color: '#FF6F00', shade: '#BF4700', score: 2  },
      { kind: 'orange',    name: 'Magmastone', radius: 28, color: '#FF3D00', shade: '#AA1A00', score: 6  },
      { kind: 'coconut',   name: 'Pyrumite',   radius: 40, color: '#DD2C00', shade: '#991A00', score: 11 },
      { kind: 'dragonfruit',name:'Infernofruit',radius: 56, color: '#F4511E', shade: '#B53000', score: 19 },
    ],
    modifiers: {
      boxWidthScale: 0.83,
      dropCooldownScale: 0.78,
      windStrength: 0.008,
    },
  },
  {
    id: 'winter',
    name: 'Winter Berry Blast',
    unlockXP: 2200,
    description: 'The Blight froze Cherry Valley solid. Ice and crosswinds test the Keeper.',
    droppableCount: 2,
    weather: 'snow',
    tiers: [
      { kind: 'holly',       name: 'Holly Sprig',  radius: 16, color: '#2E7D32', shade: '#1B5E20', score: 2  },
      { kind: 'blueberry',   name: 'Blueberry',    radius: 25, color: '#3F51B5', shade: '#283593', score: 4  },
      { kind: 'cranberry',   name: 'Cranberry',    radius: 34, color: '#C2185B', shade: '#880E4F', score: 8  },
      { kind: 'frozenmelon', name: 'Frozen Melon', radius: 62, color: '#80DEEA', shade: '#26A69A', score: 17 },
    ],
    modifiers: {
      boxWidthScale: 0.78,
      dropCooldownScale: 0.7,
      windStrength: 0.022,
    },
  },
  {
    id: 'desert_oasis',
    name: 'Desert Oasis',
    unlockXP: 3200,
    description: 'A hidden oasis — the Blight could not reach it. Rare desert fruits thrive here.',
    droppableCount: 2,
    weather: 'none',
    tiers: [
      { kind: 'cherry',    name: 'Date',        radius: 18, color: '#8D6E63', shade: '#6D4C41', score: 3  },
      { kind: 'orange',    name: 'Fig',         radius: 28, color: '#C78740', shade: '#9A6520', score: 7  },
      { kind: 'apple',     name: 'Cactus Pear', radius: 39, color: '#C8E6C9', shade: '#66BB6A', score: 12 },
      { kind: 'pineapple', name: 'Desert Melon',radius: 56, color: '#FFF176', shade: '#F9C400', score: 20 },
    ],
    modifiers: {
      boxWidthScale: 0.86,
      dropCooldownScale: 0.8,
      windStrength: 0.014,
    },
  },
  {
    id: 'sky_islands',
    name: 'Sky Islands',
    unlockXP: 4800,
    description: 'The Sky Orchard — floating islands that rose above the Blight. Wind-whipped and treacherous.',
    droppableCount: 2,
    weather: 'none',
    tiers: [
      { kind: 'blueberry',   name: 'Cloud Berry', radius: 15, color: '#E3F2FD', shade: '#90CAF9', score: 3  },
      { kind: 'cherry',      name: 'Sky Plum',    radius: 25, color: '#7986CB', shade: '#3F51B5', score: 7  },
      { kind: 'coconut',     name: 'Wind Apple',  radius: 36, color: '#B3E5FC', shade: '#4FC3F7', score: 13 },
      { kind: 'watermelon',  name: 'Storm Melon', radius: 60, color: '#4DD0E1', shade: '#0097A7', score: 22 },
    ],
    modifiers: {
      boxWidthScale: 0.74,
      dropCooldownScale: 0.72,
      windStrength: 0.028,
    },
  },
  {
    id: 'dragon_orchard',
    name: 'Dragon Orchard',
    unlockXP: 7000,
    description: 'Dragon Orchard — mythic fruits forged in dragon fire. Only the fearless Keeper dares enter.',
    droppableCount: 2,
    weather: 'meteor',
    tiers: [
      { kind: 'cherry',      name: 'Dragon Egg',   radius: 18, color: '#FF1744', shade: '#AA0020', score: 4  },
      { kind: 'dragonfruit', name: 'Drake Scale',  radius: 29, color: '#D500F9', shade: '#8E00A8', score: 9  },
      { kind: 'orange',      name: 'Wyrm Apple',   radius: 42, color: '#FF6D00', shade: '#B24800', score: 16 },
      { kind: 'watermelon',  name: 'Dragon Pearl', radius: 65, color: '#FFD600', shade: '#C49A00', score: 28 },
    ],
    modifiers: {
      boxWidthScale: 0.78,
      dropCooldownScale: 0.68,
      windStrength: 0.018,
    },
  },
  {
    id: 'cosmic',
    name: 'Cosmic Galaxy',
    unlockXP: 12000,
    description: 'The Eternal Orchard itself — shattered across the cosmos. Restore it to end the Blight forever.',
    droppableCount: 2,
    weather: 'meteor',
    tiers: [
      { kind: 'blueberry',  name: 'Stardust',    radius: 15, color: '#B39DDB', shade: '#7E57C2', score: 5  },
      { kind: 'cherry',     name: 'Nebula Orb',  radius: 25, color: '#00B0FF', shade: '#006AAF', score: 10 },
      { kind: 'coconut',    name: 'Pulsar Fruit', radius: 38, color: '#FF4081', shade: '#C2004E', score: 18 },
      { kind: 'watermelon', name: 'Black Hole',  radius: 62, color: '#1A237E', shade: '#000051', score: 30 },
    ],
    modifiers: {
      boxWidthScale: 0.72,
      dropCooldownScale: 0.65,
      windStrength: 0.032,
    },
  },
];

export function getThemeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function isThemeUnlocked(theme, totalXP) {
  return totalXP >= theme.unlockXP;
}
