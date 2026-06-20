// ---------------------------------------------------------------------------
// THEMES (a.k.a. "Levels" / "Orchards")
// ---------------------------------------------------------------------------
// Each theme is a self-contained ruleset: its own fruit ladder (which can be
// a different length than the classic 5 tiers), its own droppable subset,
// and difficulty modifiers that make later orchards meaningfully harder —
// not just reskinned. `kind` on each tier maps to a drawer function in
// fruitRenderer.js; unrecognized kinds fall back to a generic glossy circle,
// so adding a theme never risks a broken render.
// ---------------------------------------------------------------------------

export const THEMES = [
  {
    id: 'classic',
    name: 'Classic Orchard',
    unlockXP: 0,
    description: 'Where it all began. Cherries to watermelons.',
    droppableCount: 3, // first 3 tiers are player-droppable; rest are merge-only
    tiers: [
      { kind: 'cherry',     name: 'Cherry',     radius: 15, color: '#D7263D', shade: '#A11A2B', score: 1  },
      { kind: 'strawberry', name: 'Strawberry', radius: 22, color: '#FF4D6D', shade: '#C73A55', score: 3  },
      { kind: 'orange',     name: 'Orange',     radius: 31, color: '#FF8C42', shade: '#D9701F', score: 6  },
      { kind: 'apple',      name: 'Apple',      radius: 42, color: '#8BC34A', shade: '#5E8F2B', score: 10 },
      { kind: 'watermelon', name: 'Watermelon', radius: 56, color: '#2E8B57', shade: '#1F6740', score: 20 },
    ],
    modifiers: {
      boxWidthScale: 1,      // 1 = full-width jar
      dropCooldownScale: 1,  // 1 = normal drop pacing
      windStrength: 0,       // 0 = no horizontal drift force
    },
  },
  {
    id: 'tropical',
    name: 'Tropical Paradise',
    unlockXP: 500,
    description: 'A narrower jar and a stiff sea breeze. Mango to dragonfruit.',
    droppableCount: 2,
    tiers: [
      { kind: 'mango',      name: 'Mango',      radius: 19, color: '#FFB627', shade: '#E08E00', score: 2  },
      { kind: 'coconut',    name: 'Coconut',    radius: 29, color: '#8D6E4A', shade: '#5C4630', score: 5  },
      { kind: 'pineapple',  name: 'Pineapple',  radius: 40, color: '#FFD23F', shade: '#D9A400', score: 9  },
      { kind: 'dragonfruit',name: 'Dragonfruit',radius: 54, color: '#E0479E', shade: '#A8226F', score: 18 },
    ],
    modifiers: {
      boxWidthScale: 0.88,
      dropCooldownScale: 0.82, // fruit comes faster
      windStrength: 0.012,
    },
  },
  {
    id: 'winter',
    name: 'Winter Berry Blast',
    unlockXP: 1500,
    description: 'Tightest jar, fastest drops, and a biting crosswind.',
    droppableCount: 2,
    tiers: [
      { kind: 'holly',       name: 'Holly Sprig',  radius: 13, color: '#2E7D32', shade: '#1B5E20', score: 2  },
      { kind: 'blueberry',   name: 'Blueberry',    radius: 20, color: '#3F51B5', shade: '#283593', score: 4  },
      { kind: 'cranberry',   name: 'Cranberry',    radius: 27, color: '#C2185B', shade: '#880E4F', score: 8  },
      { kind: 'frozenmelon', name: 'Frozen Melon', radius: 50, color: '#80DEEA', shade: '#26A69A', score: 17 },
    ],
    modifiers: {
      boxWidthScale: 0.78,
      dropCooldownScale: 0.7,
      windStrength: 0.022,
    },
  },
];

export function getThemeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function isThemeUnlocked(theme, totalXP) {
  return totalXP >= theme.unlockXP;
}
