// tests/01-mechanics.test.js
// Core game-loop assertions: drop, merge, max-tier bonus, danger-timer
// game-over, and restart. These must all pass before the APK is built.

const path = require('path');
const { createTestContext } = require('./helpers');
const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;
const results = [];

function assert(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, ok, actual, expected });
  if (ok) passed++; else failed++;
}

function assertTruthy(name, value) {
  const ok = !!value;
  results.push({ name, ok, actual: value });
  if (ok) passed++; else failed++;
}

(async () => {
  const { page, errors, gotoGame, teardown } = await createTestContext(ROOT);

  try {
    await gotoGame();

    // --- 1. Initial state --------------------------------------------------
    const initial = await page.evaluate(() => ({
      score: window.__game.score,
      state: window.__game.state,
      bodies: window.__game.physics.getItemBodies().length,
    }));
    assert('initial score is 0', initial.score, 0);
    assert('initial state is playing', initial.state, 'playing');
    assert('initial bodies count is 0', initial.bodies, 0);

    // --- 2. Drop spawns one body -------------------------------------------
    await page.evaluate(() => {
      window.__game.setDropperX(180);
      window.__game.tryDrop();
    });
    const afterDrop = await page.evaluate(() => window.__game.physics.getItemBodies().length);
    assert('drop creates one body', afterDrop, 1);

    // --- 3. Same-tier merge produces next tier + scores --------------------
    const mergeResult = await page.evaluate(() => {
      const g = window.__game;
      for (const b of g.physics.getItemBodies()) g.physics.removeBody(b);
      const before = g.score;
      g.physics.addItem(150, 200, 1, g.tiers[1].radius); // tier 1 (Strawberry)
      g.physics.addItem(150, 200, 1, g.tiers[1].radius);
      g.physics.step(16);
      return {
        scoreDelta: g.score - before,
        bodyCount: g.physics.getItemBodies().length,
        resultTier: g.physics.getItemBodies()[0]?.tier,
      };
    });
    assertTruthy('merge awards score', mergeResult.scoreDelta > 0);
    assert('merge leaves exactly one body', mergeResult.bodyCount, 1);
    assert('merge body is next tier (2)', mergeResult.resultTier, 2);

    // --- 4. Max-tier merge awards bonus, spawns no new body ----------------
    const maxMerge = await page.evaluate(() => {
      const g = window.__game;
      for (const b of g.physics.getItemBodies()) g.physics.removeBody(b);
      const before = g.score;
      const maxTier = g.maxTierIndex;
      const r = g.tiers[maxTier].radius;
      g.physics.addItem(150, 200, maxTier, r);
      g.physics.addItem(150, 200, maxTier, r);
      g.physics.step(16);
      return { scoreDelta: g.score - before, bodyCount: g.physics.getItemBodies().length };
    });
    assertTruthy('max-tier merge awards bonus score', maxMerge.scoreDelta > 0);
    assert('max-tier merge leaves no body', maxMerge.bodyCount, 0);

    // --- 5. Danger timer triggers game over --------------------------------
    const gameOver = await page.evaluate(() => {
      const g = window.__game;
      for (const b of g.physics.getItemBodies()) g.physics.removeBody(b);
      const body = g.physics.addItem(150, 50, 0, 15);
      body.spawnTime = performance.now() - 10000;
      body.velocity = { x: 0, y: 0 };
      g._updateDangerTimer(5000); // force-exceed the 2000ms limit
      return {
        state: g.state,
        modalVisible: document.getElementById('game-over').classList.contains('visible'),
      };
    });
    assert('game over state after danger exceeded', gameOver.state, 'gameover');
    assert('game over modal is visible', gameOver.modalVisible, true);

    // --- 6. Restart resets cleanly -----------------------------------------
    const restart = await page.evaluate(() => {
      window.__game.restart();
      const g = window.__game;
      return {
        score: g.score,
        state: g.state,
        bodies: g.physics.getItemBodies().length,
        paused: g.paused,
        modalVisible: document.getElementById('game-over').classList.contains('visible'),
      };
    });
    assert('restart score is 0', restart.score, 0);
    assert('restart state is playing', restart.state, 'playing');
    assert('restart clears bodies', restart.bodies, 0);
    assert('restart clears paused flag', restart.paused, false);
    assert('restart hides game-over modal', restart.modalVisible, false);

    // --- 7. No console errors during test run ------------------------------
    assert('no console errors', errors.length, 0);

  } finally {
    await teardown();
  }

  // Print results
  console.log('\n=== 01-mechanics ===');
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    const detail = r.ok ? '' : `  expected=${JSON.stringify(r.expected)} got=${JSON.stringify(r.actual)}`;
    console.log(`  ${icon} ${r.name}${detail}`);
  }
  console.log(`  ${passed} passed, ${failed} failed`);

  if (failed > 0) process.exit(1);
})();
