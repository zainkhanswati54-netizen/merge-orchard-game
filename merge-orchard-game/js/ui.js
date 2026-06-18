import { CONFIG } from './config.js';
import { TIERS } from './items.js';

export class UI {
  constructor({ onRestart }) {
    this.scoreEl = document.getElementById('score-value');
    this.highScoreEl = document.getElementById('highscore-value');
    this.gameOverEl = document.getElementById('game-over');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalHighScoreEl = document.getElementById('final-highscore');
    this.newHighBadgeEl = document.getElementById('new-high-badge');
    this.restartBtn = document.getElementById('restart-btn');
    this.dangerLineEl = document.getElementById('danger-indicator');
    this.nextSwatchEl = document.getElementById('next-swatch');

    this.highScore = this._loadHighScore();
    this.highScoreEl.textContent = this.highScore;

    this.restartBtn.addEventListener('click', () => onRestart());
  }

  _loadHighScore() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY_HIGHSCORE);
      return raw ? parseInt(raw, 10) || 0 : 0;
    } catch (e) {
      return 0; // localStorage unavailable (e.g. private mode) — fail quietly
    }
  }

  _saveHighScore(value) {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY_HIGHSCORE, String(value));
    } catch (e) {
      /* ignore — game still works without persistence */
    }
  }

  setScore(score) {
    this.scoreEl.textContent = score;
  }

  setNextPreview(tierIndex) {
    if (!this.nextSwatchEl) return;
    const tier = TIERS[tierIndex];
    this.nextSwatchEl.style.background = tier.color;
  }

  // Call continuously while a stack is sitting in the danger zone so the
  // line can pulse and warn the player before the 3-second timer expires.
  setDangerProgress(progress01) {
    this.dangerLineEl.style.opacity = String(Math.min(1, progress01 * 1.3));
  }

  showGameOver(finalScore) {
    const isNewHigh = finalScore > this.highScore;
    if (isNewHigh) {
      this.highScore = finalScore;
      this._saveHighScore(finalScore);
      this.highScoreEl.textContent = this.highScore;
    }
    this.finalScoreEl.textContent = finalScore;
    this.finalHighScoreEl.textContent = this.highScore;
    this.newHighBadgeEl.style.display = isNewHigh ? 'inline-block' : 'none';
    this.gameOverEl.classList.add('visible');
  }

  hideGameOver() {
    this.gameOverEl.classList.remove('visible');
  }
}
