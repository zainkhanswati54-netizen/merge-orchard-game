// The 5-tier merge progression. Index 0 is the smallest droppable item,
// index 4 (MAX) is the final item — merging two of those is the biggest
// possible payoff and does not spawn anything further.
export const TIERS = [
  { name: 'Cherry',     radius: 15, color: '#D7263D', shade: '#A11A2B', score: 1  },
  { name: 'Strawberry', radius: 22, color: '#FF4D6D', shade: '#C73A55', score: 3  },
  { name: 'Orange',     radius: 31, color: '#FF8C42', shade: '#D9701F', score: 6  },
  { name: 'Apple',      radius: 42, color: '#8BC34A', shade: '#5E8F2B', score: 10 },
  { name: 'Watermelon', radius: 56, color: '#2E8B57', shade: '#1F6740', score: 20 },
];

export const MAX_TIER_INDEX = TIERS.length - 1;

export function randomDroppableTier(droppableIndices) {
  const i = droppableIndices[Math.floor(Math.random() * droppableIndices.length)];
  return i;
}
