// tests/04-ui-screens.test.js
// UI screen navigation: loading → menu → level select → game → pause →
// game-over → restart. Also tests the Settings/Leaderboard overlays and
// that the Level Select correctly shows locked/unlocked themes based on XP.

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

(async () => {
  const { page, errors, BASE, teardown } = await createTestContext(ROOT);

  try {
    // 1. Loading screen shows, then transitions to main menu
    await page.goto(BASE + '/index.html');
    await page.waitForSelector('#main-menu.visible', { timeout: 15000 });
    const menuVisible = await page.evaluate(() =>
      document.getElementById('main-menu').classList.contains('visible'));
    assert('main menu appears after loading', menuVisible, true);

    // 2. Level select renders with cards
    await page.click('#menu-play-btn');
    await page.waitForSelector('#level-select-screen.visible', { timeout: 5000 });
    const levelSelectInfo = await page.evaluate(() => {
      const cards = document.querySelectorAll('.level-card');
      const unlockedCards = document.querySelectorAll('.level-card:not(.is-locked)');
      return {
        cardCount: cards.length,
        unlockedCount: unlockedCards.length,
      };
    });
    assert('3 theme cards rendered', levelSelectInfo.cardCount, 3);
    assert('1 card unlocked at 0 XP (classic only)', levelSelectInfo.unlockedCount, 1);

    // 3. Locked card shows the correct XP requirement
    const lockedCardText = await page.evaluate(() => {
      const lock = document.querySelector('.level-card-lock-label');
      return lock ? lock.textContent.trim() : null;
    });
    assertTruthy('locked card shows XP requirement', lockedCardText && lockedCardText.includes('XP'));

    // 4. Back button returns to main menu
    await page.click('#level-select-back-btn');
    await page.waitForTimeout(200);
    const backToMenu = await page.evaluate(() =>
      document.getElementById('main-menu').classList.contains('visible'));
    assert('Back button returns to main menu', backToMenu, true);

    // 5. Settings overlay opens from main menu, close returns to menu
    await page.click('#menu-settings-btn');
    await page.waitForTimeout(150);
    const settingsOpen = await page.evaluate(() =>
      document.getElementById('settings-overlay').classList.contains('visible'));
    assert('Settings overlay opens from main menu', settingsOpen, true);

    await page.click('#settings-close-btn', { force: true });
    await page.waitForTimeout(150);
    const settingsClosed = await page.evaluate(() =>
      !document.getElementById('settings-overlay').classList.contains('visible'));
    assert('Settings overlay closes', settingsClosed, true);

    // 6. Leaderboard overlay shows the empty-state message when no scores
    await page.click('#menu-leaderboard-btn');
    await page.waitForTimeout(150);
    const leaderboardInfo = await page.evaluate(() => ({
      visible: document.getElementById('leaderboard-overlay').classList.contains('visible'),
      hasEmptyMsg: !!document.querySelector('.leaderboard-empty'),
    }));
    assert('Leaderboard overlay opens', leaderboardInfo.visible, true);
    assert('Leaderboard shows empty-state message', leaderboardInfo.hasEmptyMsg, true);

    await page.click('#leaderboard-close-btn', { force: true });
    await page.waitForTimeout(150);

    // 7. Navigating to game via level select
    await page.click('#menu-play-btn');
    await page.waitForSelector('#level-select-screen.visible', { timeout: 5000 });
    await page.click('.level-card:not(.is-locked)');
    await page.waitForFunction(() => window.__game && window.__game.state === 'playing', { timeout: 10000 });
    const gameScreenVisible = await page.evaluate(() =>
      document.getElementById('game-screen').classList.contains('visible'));
    assert('game screen visible after level select', gameScreenVisible, true);

    // 8. Game-over modal shows final score and "personal best" copy
    await page.evaluate(() => {
      const g = window.__game;
      g.score = 77;
      g._triggerGameOver();
    });
    await page.waitForTimeout(1200); // wait for score tally animation
    const gameOverInfo = await page.evaluate(() => ({
      modalVisible: document.getElementById('game-over').classList.contains('visible'),
      finalScore: document.getElementById('final-score').textContent,
      personalBestLabel: document.querySelector('[id="final-highscore"]') !== null,
    }));
    assert('game-over modal is visible', gameOverInfo.modalVisible, true);
    assert('final score shows 77', gameOverInfo.finalScore, '77');
    assert('personal best element exists in modal', gameOverInfo.personalBestLabel, true);

    // 9. Restart from game-over resets to playing state
    await page.click('#restart-btn', { force: true });
    await page.waitForTimeout(200);
    const afterRestart = await page.evaluate(() => ({
      state: window.__game.state,
      score: window.__game.score,
      modalGone: !document.getElementById('game-over').classList.contains('visible'),
    }));
    assert('state is playing after game-over restart', afterRestart.state, 'playing');
    assert('score reset to 0 after restart', afterRestart.score, 0);
    assert('game-over modal gone after restart', afterRestart.modalGone, true);

    // 10. XP bar elements are present
    const xpBarPresent = await page.evaluate(() => ({
      wrap:  !!document.getElementById('xp-bar-wrap'),
      fill:  !!document.getElementById('xp-bar-fill'),
      level: !!document.getElementById('xp-level-label'),
    }));
    assert('XP bar wrap element exists', xpBarPresent.wrap, true);
    assert('XP bar fill element exists', xpBarPresent.fill, true);
    assert('XP level label exists', xpBarPresent.level, true);

    assert('no console errors throughout', errors.length, 0);

  } finally {
    await teardown();
  }

  console.log('\n=== 04-ui-screens ===');
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    const detail = r.ok ? '' : `  expected=${JSON.stringify(r.expected)} got=${JSON.stringify(r.actual)}`;
    console.log(`  ${icon} ${r.name}${detail}`);
  }
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
