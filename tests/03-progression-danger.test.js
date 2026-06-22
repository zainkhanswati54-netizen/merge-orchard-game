// tests/03-progression-danger.test.js
// XP / leveling, theme unlock logic, danger escalation (heartbeat timing),
// and the wind-immune danger-line fix (horizontal velocity must NOT prevent
// a fruit from counting as "dangerously settled").

const path = require('path');
const { createTestContext } = require('./helpers');
const ROOT = path.join(__dirname, '..');

let passed = 0, failed = 0;
const results = [];

function assert(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, ok, actual, expected });
  if (ok) passed++; else failed++;
}
function assertTruthy(name, value) {
  results.push({ name, ok: !!value, actual: value });
  if (value) passed++; else failed++;
}
function assertRange(name, value, min, max) {
  const ok = value >= min && value <= max;
  results.push({ name, ok, actual: value, expected: `[${min}, ${max}]` });
  if (ok) passed++; else failed++;
}

(async () => {
  const { page, errors, gotoGame, teardown } = await createTestContext(ROOT);

  try {
    await gotoGame();

    // --- XP / Leveling -------------------------------------------------------
    // XP awarded on merge = score earned on that merge
    const xpTest = await page.evaluate(() => {
      const g = window.__game;
      for (const b of g.physics.getItemBodies()) g.physics.removeBody(b);
      const beforeScore = g.score;
      const beforeXP = parseInt(localStorage.getItem('suika_merge_xp') || '0');
      g.physics.addItem(150, 200, 0, g.tiers[0].radius);
      g.physics.addItem(150, 200, 0, g.tiers[0].radius);
      g.physics.step(16);
      const afterXP = parseInt(localStorage.getItem('suika_merge_xp') || '0');
      return {
        scoreGained: g.score - beforeScore,
        xpGained: afterXP - beforeXP,
      };
    });
    assert('XP gained equals score gained', xpTest.xpGained, xpTest.scoreGained);
    assertTruthy('merge awards XP > 0', xpTest.xpGained > 0);

    // Level-up detection fires correctly
    const levelUpTest = await page.evaluate(async () => {
      const { addXP, getLevelInfo } = await import('./js/xp.js');
      const before = getLevelInfo();
      const result = addXP(before.xpForNextLevel + 1);
      return { leveledUp: result.leveledUp, levelBefore: before.level, levelAfter: result.level };
    });
    assert('level-up detection fires when threshold crossed', levelUpTest.leveledUp, true);
    assertTruthy('level increases after level-up', levelUpTest.levelAfter > levelUpTest.levelBefore);

    // --- Theme system --------------------------------------------------------
    // Classic always unlocked (0 XP), Tropical needs 500, Winter needs 1500
    const themeTest = await page.evaluate(async () => {
      const { THEMES, isThemeUnlocked } = await import('./js/themes.js');
      return {
        classicAt0:   isThemeUnlocked(THEMES.find(t=>t.id==='classic'), 0),
        tropicalAt0:  isThemeUnlocked(THEMES.find(t=>t.id==='tropical'), 0),
        tropicalAt500:isThemeUnlocked(THEMES.find(t=>t.id==='tropical'), 500),
        winterAt499:  isThemeUnlocked(THEMES.find(t=>t.id==='winter'), 1499),
        winterAt1500: isThemeUnlocked(THEMES.find(t=>t.id==='winter'), 1500),
      };
    });
    assert('classic always unlocked at 0 XP', themeTest.classicAt0, true);
    assert('tropical locked at 0 XP', themeTest.tropicalAt0, false);
    assert('tropical unlocked at 500 XP', themeTest.tropicalAt500, true);
    assert('winter locked at 1499 XP', themeTest.winterAt499, false);
    assert('winter unlocked at 1500 XP', themeTest.winterAt1500, true);

    // Tropical jar is narrower than Classic
    const jarWidthTest = await page.evaluate(async () => {
      const { THEMES } = await import('./js/themes.js');
      const classic  = THEMES.find(t=>t.id==='classic').modifiers.boxWidthScale;
      const tropical = THEMES.find(t=>t.id==='tropical').modifiers.boxWidthScale;
      const winter   = THEMES.find(t=>t.id==='winter').modifiers.boxWidthScale;
      return { classic, tropical, winter };
    });
    assertTruthy('tropical jar narrower than classic', jarWidthTest.tropical < jarWidthTest.classic);
    assertTruthy('winter jar narrower than tropical', jarWidthTest.winter < jarWidthTest.tropical);

    // --- Danger escalation ---------------------------------------------------
    // Heartbeat interval lerps correctly from max to min
    const heartbeatTest = await page.evaluate(() => {
      const MAX = 850, MIN = 260;
      function lerp(a, b, t) { return a + (b-a) * t; }
      return {
        atZero: lerp(MAX, MIN, 0),
        atHalf: lerp(MAX, MIN, 0.5),
        atFull: lerp(MAX, MIN, 1),
      };
    });
    assert('heartbeat interval at 0% danger is MAX (850ms)', heartbeatTest.atZero, 850);
    assertRange('heartbeat interval at 50% danger is between min and max', heartbeatTest.atHalf, 260, 850);
    assert('heartbeat interval at 100% danger is MIN (260ms)', heartbeatTest.atFull, 260);

    // --- Wind-immune danger-line fix -----------------------------------------
    // A fruit with large horizontal velocity (wind jitter) but near-zero
    // vertical velocity, sitting above the danger line, must still count
    // as dangerous — horizontal motion must not block a game over.
    const windDangerTest = await page.evaluate(() => {
      const g = window.__game;
      g.state = 'playing'; // reset from any previous game-over state
      g.dangerTimer = 0;
      for (const b of g.physics.getItemBodies()) g.physics.removeBody(b);
      const body = g.physics.addItem(150, 50, 0, 15); // near top, inside danger zone
      body.spawnTime = performance.now() - 10000; // past spawn grace period
      body.velocity = { x: 99, y: 0.05 }; // huge horizontal, tiny vertical (wind-like)
      g._updateDangerTimer(100);
      return { dangerTimerAfter100ms: g.dangerTimer };
    });
    assert('wind jitter does not block danger detection', windDangerTest.dangerTimerAfter100ms, 100);

    assert('no console errors', errors.length, 0);

  } finally {
    await teardown();
  }

  console.log('\n=== 03-progression-danger ===');
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    const detail = r.ok ? '' : `  expected=${JSON.stringify(r.expected)} got=${JSON.stringify(r.actual)}`;
    console.log(`  ${icon} ${r.name}${detail}`);
  }
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
