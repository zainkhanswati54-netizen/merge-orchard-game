import { CONFIG } from './config.js';
import { Game } from './game.js';
import { initScreens, runLoadingSequence } from './screens.js';

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

  // The Game instance is created lazily on the first "Play" press rather
  // than at boot — no point ticking physics behind the main menu. Pressing
  // Play again later just restarts the same instance in place.
  let game = null;

  initScreens({
    onPlay: () => {
      if (!game) {
        game = new Game(canvas);
        window.__game = game; // handy for console debugging
      } else {
        game.restart();
      }
    },
    onPauseGame: () => game?.pause(),
    onResumeGame: () => game?.resume(),
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
