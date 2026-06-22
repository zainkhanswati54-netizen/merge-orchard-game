// tests/02-pause-menu.test.js
// Pause menu: opens/closes correctly, pause flag sets/clears, restart from
// pause does NOT leave the game permanently frozen (the bug we fixed), and
// the Settings sub-menu opens on top without accidentally resuming play.

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

(async () => {
  const { page, errors, gotoGame, teardown } = await createTestContext(ROOT);

  try {
    await gotoGame();

    // 1. Open pause menu via HUD button
    await page.click('#hud-pause-btn');
    await page.waitForTimeout(200);
    const pauseOpen = await page.evaluate(() => ({
      overlayVisible: document.getElementById('pause-overlay').classList.contains('visible'),
      gamePaused: window.__game.paused,
    }));
    assert('pause overlay opens', pauseOpen.overlayVisible, true);
    assert('game is paused when menu opens', pauseOpen.gamePaused, true);

    // 2. Settings opens on top, pause menu stays open
    await page.click('#pause-settings-btn', { force: true });
    await page.waitForTimeout(150);
    const settingsOnTop = await page.evaluate(() => ({
      settingsVisible: document.getElementById('settings-overlay').classList.contains('visible'),
      pauseStillVisible: document.getElementById('pause-overlay').classList.contains('visible'),
    }));
    assert('settings overlay opens from pause', settingsOnTop.settingsVisible, true);
    assert('pause menu stays open underneath settings', settingsOnTop.pauseStillVisible, true);

    // 3. Closing settings returns to pause menu without resuming game
    await page.click('#settings-close-btn', { force: true });
    await page.waitForTimeout(150);
    const afterSettingsClose = await page.evaluate(() => ({
      settingsGone: !document.getElementById('settings-overlay').classList.contains('visible'),
      pauseStillVisible: document.getElementById('pause-overlay').classList.contains('visible'),
      gameStillPaused: window.__game.paused,
    }));
    assert('settings closes', afterSettingsClose.settingsGone, true);
    assert('pause menu still visible after settings close', afterSettingsClose.pauseStillVisible, true);
    assert('game remains paused after settings close', afterSettingsClose.gameStillPaused, true);

    // 4. Restart from pause — the bug fix: must clear the paused flag
    await page.evaluate(() => { window.__game.score = 42; });
    await page.click('#pause-restart-btn', { force: true });
    await page.waitForTimeout(150);
    const afterRestart = await page.evaluate(() => ({
      pauseGone: !document.getElementById('pause-overlay').classList.contains('visible'),
      gamePaused: window.__game.paused,
      score: window.__game.score,
      state: window.__game.state,
    }));
    assert('pause menu closes after restart', afterRestart.pauseGone, true);
    assert('game NOT paused after restart-from-pause (bug fix)', afterRestart.gamePaused, false);
    assert('score reset after restart', afterRestart.score, 0);
    assert('state is playing after restart', afterRestart.state, 'playing');

    // 5. The restarted game actually ticks (a drop should work)
    await page.evaluate(() => window.__game.tryDrop());
    await page.waitForTimeout(100);
    const bodyCount = await page.evaluate(() => window.__game.physics.getItemBodies().length);
    assert('game ticks after restart-from-pause', bodyCount, 1);

    // 6. Resume returns to game without restarting
    await page.click('#hud-pause-btn');
    await page.waitForTimeout(100);
    await page.evaluate(() => { window.__game.score = 99; }); // mark pre-resume score
    await page.click('#pause-resume-btn', { force: true });
    await page.waitForTimeout(100);
    const afterResume = await page.evaluate(() => ({
      pauseGone: !document.getElementById('pause-overlay').classList.contains('visible'),
      gamePaused: window.__game.paused,
      score: window.__game.score, // must NOT be reset
    }));
    assert('pause menu gone after resume', afterResume.pauseGone, true);
    assert('game not paused after resume', afterResume.gamePaused, false);
    assert('score preserved after resume (not reset)', afterResume.score, 99);

    // 7. Home navigates back to main menu
    await page.click('#hud-pause-btn');
    await page.waitForTimeout(100);
    await page.click('#pause-home-btn', { force: true });
    await page.waitForTimeout(200);
    const afterHome = await page.evaluate(() => ({
      menuVisible: document.getElementById('main-menu').classList.contains('visible'),
      pauseGone: !document.getElementById('pause-overlay').classList.contains('visible'),
    }));
    assert('main menu visible after Home', afterHome.menuVisible, true);
    assert('pause menu hidden after Home', afterHome.pauseGone, true);

    assert('no console errors', errors.length, 0);

  } finally {
    await teardown();
  }

  console.log('\n=== 02-pause-menu ===');
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    const detail = r.ok ? '' : `  expected=${JSON.stringify(r.expected)} got=${JSON.stringify(r.actual)}`;
    console.log(`  ${icon} ${r.name}${detail}`);
  }
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
