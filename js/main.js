import { CONFIG } from './config.js';
import { Game } from './game.js';
import { initScreens, runLoadingSequence, showScreen, getChosenWeather } from './screens.js';
import { getThemeById } from './themes.js';

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = CONFIG.BOX_WIDTH * dpr;
  canvas.height = CONFIG.BOX_HEIGHT * dpr;
  canvas.style.width = '100%';
  canvas.style.aspectRatio = `${CONFIG.BOX_WIDTH} / ${CONFIG.BOX_HEIGHT}`;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
}

window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('game-canvas');
  setupCanvas(canvas);

  // The Game instance is created lazily on the first level selection rather
  // than at boot — no point ticking physics behind the menu. Selecting a
  // level again later (same or different orchard) just restarts the same
  // instance in place via Game#restart(theme).
  let game = null;

  function startGame(themeId) {
    const theme = getThemeById(themeId);
    showScreen('game');
    // Resolve weather: 'auto' lets the theme decide, otherwise use the player's choice.
    const pref = getChosenWeather();
    const weatherOverride = (pref === 'auto') ? null : pref;
    if (!game) {
      game = new Game(canvas, theme, weatherOverride);
      window.__game = game; // handy for console debugging
    } else {
      game.restart(theme, weatherOverride);
    }
  }

  initScreens({
    onSelectLevel: (themeId) => startGame(themeId),
    onPauseGame: () => game?.pause(),
    onResumeGame: () => game?.resume(),
    onRestartGame: () => game?.restart(), // no theme arg = same orchard, fast retry from the pause menu
  });

  // Loading screen is visible by default in the HTML; this fills its
  // progress bar through real steps and then reveals the main menu.
  await runLoadingSequence();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline support is a nice-to-have, never block the game on it */
    });
  }
});
