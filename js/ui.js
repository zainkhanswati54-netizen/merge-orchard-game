import { CONFIG } from './config.js';
import { getLevelInfo, onXPChange } from './xp.js';
import { ConfettiBurst } from './confetti.js';
import { lerp, easeOutQuad } from './utils.js';
import { playClickSound } from './audio.js';

export class UI {
  constructor({ onRestart } = {}) {
    this.scoreEl = document.getElementById('score-value');
    this.highScoreEl = document.getElementById('highscore-value');
    this.gameOverEl = document.getElementById('game-over');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalHighScoreEl = document.getElementById('final-highscore');
    this.newHighBadgeEl = document.getElementById('new-high-badge');
    this.restartBtn = document.getElementById('restart-btn');
    this.dangerLineEl = document.getElementById('danger-indicator');
    this.dangerVignetteEl = document.getElementById('danger-vignette');
    this.nextSwatchEl = document.getElementById('next-swatch');
    this.nextNameEl = document.getElementById('next-name');

    // XP bar
    this.xpBarWrapEl = document.getElementById('xp-bar-wrap');
    this.xpBarFillEl = document.getElementById('xp-bar-fill');
    this.xpLevelLabelEl = document.getElementById('xp-level-label');
    this.xpFractionLabelEl = document.getElementById('xp-fraction-label');

    this.highScore = this._loadHighScore();
    this.highScoreEl.textContent = this.highScore;

    this._scoreTallyToken = 0; // invalidates any in-flight tally animation if a new one starts

    this.restartBtn.addEventListener('click', () => {
      playClickSound();
      onRestart?.();
    });

    this._initXPBar();

    // Game Over confetti — its own small canvas inside the modal, sized to
    // the card's actual rendered footprint (with sane minimums in case
    // layout hasn't settled yet at construction time).
    const confettiCanvas = document.getElementById('gameover-confetti');
    if (confettiCanvas) {
      const rect = confettiCanvas.getBoundingClientRect();
      confettiCanvas.width = Math.max(280, Math.round(rect.width)) || 300;
      confettiCanvas.height = Math.max(360, Math.round(rect.height)) || 400;
      this.confetti = new ConfettiBurst(confettiCanvas);
      this.confettiCanvas = confettiCanvas;
    }
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

  // tier is now a full tier object ({ name, color, shade, radius, kind, ... })
  // rather than an index, since different themes have differently-shaped
  // tier arrays — this keeps the preview theme-agnostic.
  setNextPreview(tier) {
    if (!this.nextSwatchEl || !tier) return;

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
  // line can pulse and warn the player before the danger timer expires.
  // Also drives the full-stage red "fear" vignette — the line alone is
  // easy to miss mid-action, the vignette is not.
  setDangerProgress(progress01) {
    this.dangerLineEl.style.opacity = String(Math.min(1, progress01 * 1.3));
    if (this.dangerVignetteEl) {
      this.dangerVignetteEl.style.opacity = String(Math.min(0.85, progress01 * progress01 * 1.1));
      this.dangerVignetteEl.classList.toggle('danger-vignette-active', progress01 > 0.02);
    }
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
    this.finalHighScoreEl.textContent = this.highScore;
    this.newHighBadgeEl.style.display = isNewHigh ? 'inline-block' : 'none';
    this.gameOverEl.classList.add('visible');

    this._animateScoreTally(finalScore);

    if (isNewHigh && this.confetti && this.confettiCanvas) {
      // Burst from just above where the score number sits.
      requestAnimationFrame(() => {
        this.confetti.burst(this.confettiCanvas.width / 2, this.confettiCanvas.height * 0.22, 90);
      });
    }
  }

  // Counts the final score up from 0 rather than just slamming the number
  // in — a beat of suspense before the result lands. A token guards against
  // a stale animation finishing after a newer Game Over has already begun.
  _animateScoreTally(target) {
    const token = ++this._scoreTallyToken;
    const duration = 900;
    const start = performance.now();

    const step = (now) => {
      if (token !== this._scoreTallyToken) return; // superseded by a newer call
      const t = Math.min(1, (now - start) / duration);
      const value = Math.round(lerp(0, target, easeOutQuad(t)));
      this.finalScoreEl.textContent = value;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        this.finalScoreEl.textContent = target;
      }
    };
    requestAnimationFrame(step);
  }

  hideGameOver() {
    this.gameOverEl.classList.remove('visible');
    this.confetti?.clear();
  }

  // ---- XP bar ----------------------------------------------------------

  _initXPBar() {
    if (!this.xpBarFillEl) return;
    this._renderXP(getLevelInfo());
    onXPChange(({ after, leveledUp }) => this._handleXPChange(after, leveledUp));
  }

  _renderXP(info) {
    if (!this.xpBarFillEl) return;
    this.xpBarFillEl.style.width = `${Math.round(info.progress01 * 100)}%`;
    if (this.xpLevelLabelEl) this.xpLevelLabelEl.textContent = `Lv ${info.level}`;
    if (this.xpFractionLabelEl) {
      this.xpFractionLabelEl.textContent = `${info.xpIntoLevel} / ${info.xpForNextLevel} XP`;
    }
  }

  _handleXPChange(after, leveledUp) {
    this._renderXP(after);
    if (leveledUp && this.xpBarWrapEl) {
      this.xpBarWrapEl.classList.remove('level-up-flash'); // restart the animation even if triggered twice quickly
      void this.xpBarWrapEl.offsetWidth; // force reflow so the class re-add is treated as a fresh animation
      this.xpBarWrapEl.classList.add('level-up-flash');
    }
  }
}
