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
    this.nextNameEl = document.getElementById('next-name');

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

    // Same look as the in-game fruit (radial gradient with a highlight and a
    // shaded edge) so the preview genuinely reads as "this exact fruit",
    // not just a flat color swatch.
    this.nextSwatchEl.style.background =
      `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.85), ${tier.color} 55%, ${tier.shade} 100%)`;

    // Scale the swatch itself with the tier's real radius (clamped to fit
    // the HUD card) so a bigger upcoming fruit visibly looks bigger —
    // useful for planning where to leave room in the jar.
    const size = Math.round(20 + tier.radius * 0.55);
    this.nextSwatchEl.style.width = `${size}px`;
    this.nextSwatchEl.style.height = `${size}px`;

    if (this.nextNameEl) this.nextNameEl.textContent = tier.name;
  }

  // Call continuously while a stack is sitting in the danger zone so the
  // line can pulse and warn the player before the 3-second timer expires.
  setDangerProgress(progress01) {
    this.dangerLineEl.style.opacity = String(Math.min(1, progress01 * 1.3));
  }

  // Persists a beaten high score the instant it happens during play — not
  // just when Game Over eventually shows. Android (and mobile browsers in
  // general) can kill an app mid-session at any time with no warning, so
  // waiting for a formal "game over" to save would risk losing a score the
  // player never technically saw lost. Cheap to call from merge events
  // (score only changes there); avoid calling this every animation frame.
  reportLiveScore(score) {
    if (score > this.highScore) {
      this.highScore = score;
      this._saveHighScore(score);
      this.highScoreEl.textContent = this.highScore;
    }
  }

  showGameOver(finalScore) {
    const isNewHigh = finalScore > this.highScore;
    this.reportLiveScore(finalScore); // covers the (rare) case it wasn't already saved live
    this.finalScoreEl.textContent = finalScore;
    this.finalHighScoreEl.textContent = this.highScore;
    this.newHighBadgeEl.style.display = isNewHigh ? 'inline-block' : 'none';
    this.gameOverEl.classList.add('visible');
  }

  hideGameOver() {
    this.gameOverEl.classList.remove('visible');
  }
}
