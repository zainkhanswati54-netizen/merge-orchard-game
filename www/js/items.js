// Kept for backward compatibility (and as a quick standalone reference) —
// the classic 5-tier ladder now lives as the "classic" entry in
// js/themes.js, which is the single source of truth. This file just
// re-exports it under the original names.
import { THEMES } from './themes.js';

const classicTheme = THEMES.find((t) => t.id === 'classic');

export const TIERS = classicTheme.tiers;
export const MAX_TIER_INDEX = TIERS.length - 1;

export function randomDroppableTier(droppableIndices) {
  const i = droppableIndices[Math.floor(Math.random() * droppableIndices.length)];
  return i;
}
