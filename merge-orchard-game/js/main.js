import { CONFIG } from './config.js';
import { Game } from './game.js';

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = CONFIG.BOX_WIDTH * dpr;
  canvas.height = CONFIG.BOX_HEIGHT * dpr;
  canvas.style.width = '100%';
  canvas.style.aspectRatio = `${CONFIG.BOX_WIDTH} / ${CONFIG.BOX_HEIGHT}`;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  setupCanvas(canvas);
  window.__game = new Game(canvas); // exposed for easy console debugging

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline support is a nice-to-have, never block the game on it */
    });
  }
});
