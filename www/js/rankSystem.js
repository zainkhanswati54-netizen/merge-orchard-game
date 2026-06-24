// ---------------------------------------------------------------------------
// RANK SYSTEM
// ---------------------------------------------------------------------------
// Assigns a rank to a final score. Used on the Game Over screen.
// ---------------------------------------------------------------------------

const RANKS = [
  { name: 'Legend',   minScore: 20000, color: '#FF6B35', emoji: '👑' },
  { name: 'Master',   minScore: 10000, color: '#9B59B6', emoji: '💜' },
  { name: 'Diamond',  minScore:  5000, color: '#00BCD4', emoji: '💎' },
  { name: 'Platinum', minScore:  2500, color: '#78909C', emoji: '⚡' },
  { name: 'Gold',     minScore:  1000, color: '#FFC107', emoji: '🥇' },
  { name: 'Silver',   minScore:   500, color: '#90A4AE', emoji: '🥈' },
  { name: 'Bronze',   minScore:     0, color: '#CD7F32', emoji: '🥉' },
];

export function getRankForScore(score) {
  for (const rank of RANKS) {
    if (score >= rank.minScore) return rank;
  }
  return RANKS[RANKS.length - 1];
}

export function getAllRanks() {
  return [...RANKS];
}

// What score you need for the NEXT rank up, given the current score.
export function getNextRankInfo(score) {
  const currentRank = getRankForScore(score);
  const currentIndex = RANKS.findIndex((r) => r.name === currentRank.name);
  if (currentIndex === 0) return null; // already Legend
  const nextRank = RANKS[currentIndex - 1];
  return {
    rank: nextRank,
    scoreNeeded: nextRank.minScore - score,
  };
}
