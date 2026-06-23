import { CONFIG } from './config.js';
import { getLevelInfo, onXPChange } from './xp.js';
import { getTotalCoins, onCoinsChange } from './coins.js';
import { ConfettiBurst } from './confetti.js';
import { lerp, easeOutQuad } from './utils.js';
import { playClickSound } from './audio.js';
import { getRankForScore, getNextRankInfo } from './rankSystem.js';
import { POWER_DEFS, getPowerCount, buyPower } from './powers.js';

export class UI {
  constructor({ onRestart, onUsePower } = {}) {
    this.onUsePower = onUsePower;

    this.scoreEl          = document.getElementById('score-value');
    this.highScoreEl      = document.getElementById('highscore-value');
    this.gameOverEl        = document.getElementById('game-over');
    this.finalScoreEl      = document.getElementById('final-score');
    this.finalHighScoreEl  = document.getElementById('final-highscore');
    this.newHighBadgeEl    = document.getElementById('new-high-badge');
    this.newRecordBannerEl = document.getElementById('new-record-banner');
    this.restartBtn       = document.getElementById('restart-btn');
    this.dangerLineEl     = document.getElementById('danger-indicator');
    this.dangerVignetteEl = document.getElementById('danger-vignette');
    this.nextSwatchEl     = document.getElementById('next-swatch');
    this.nextNameEl       = document.getElementById('next-name');

    // Coins HUD
    this.coinsHudEl       = document.getElementById('hud-coins-value');
    this._sessionCoins    = 0;

    // Game Over extended stats
    this.goMergesEl       = document.getElementById('go-merges');
    this.goComboEl        = document.getElementById('go-combo');
    this.goCoinsEl        = document.getElementById('go-coins');
    this.goXpEl           = document.getElementById('go-xp');
    this.goRankEl         = document.getElementById('go-rank');
    this.goRankNameEl     = document.getElementById('go-rank-name');
    this.goNextRankEl     = document.getElementById('go-next-rank');

    // XP bar
    this.xpBarWrapEl      = document.getElementById('xp-bar-wrap');
    this.xpBarFillEl      = document.getElementById('xp-bar-fill');
    this.xpLevelLabelEl   = document.getElementById('xp-level-label');
    this.xpFractionLabelEl= document.getElementById('xp-fraction-label');

    this.highScore = this._loadHighScore();
    if (this.highScoreEl) this.highScoreEl.textContent = this.highScore;

    this._scoreTallyToken = 0;

    this.restartBtn?.addEventListener('click', () => {
      playClickSound();
      onRestart?.();
    });

    this._initXPBar();
    this._initCoinsDisplay();
    this._initPowerShop();

    const confettiCanvas = document.getElementById('gameover-confetti');
    if (confettiCanvas) {
      const rect = confettiCanvas.getBoundingClientRect();
      confettiCanvas.width  = Math.max(280, Math.round(rect.width))  || 300;
      confettiCanvas.height = Math.max(360, Math.round(rect.height)) || 400;
      this.confetti = new ConfettiBurst(confettiCanvas);
      this.confettiCanvas = confettiCanvas;
    }
  }

  _loadHighScore() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY_HIGHSCORE);
      return raw ? parseInt(raw, 10) || 0 : 0;
    } catch (e) { return 0; }
  }

  _saveHighScore(value) {
    try { localStorage.setItem(CONFIG.STORAGE_KEY_HIGHSCORE, String(value)); } catch (e) {}
  }

  setScore(score) {
    if (this.scoreEl) this.scoreEl.textContent = score;
  }

  setCoins(sessionCoins) {
    this._sessionCoins = sessionCoins;
    if (this.coinsHudEl) this.coinsHudEl.textContent = sessionCoins;
  }

  addSessionCoins(amount) {
    this._sessionCoins += amount;
    if (this.coinsHudEl) this.coinsHudEl.textContent = this._sessionCoins;
  }

  setNextPreview(tier) {
    if (!this.nextSwatchEl || !tier) return;
    this.nextSwatchEl.style.background =
      `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.85), ${tier.color} 55%, ${tier.shade} 100%)`;
    const size = Math.round(20 + tier.radius * 0.55);
    this.nextSwatchEl.style.width  = `${size}px`;
    this.nextSwatchEl.style.height = `${size}px`;
    if (this.nextNameEl) this.nextNameEl.textContent = tier.name;
  }

  setEvolutionChain(tiers, fromIndex) {
    const el = document.getElementById('evolution-panel');
    if (!el || !tiers?.length) return;

    // Show the current fruit and up to 3 merge results after it.
    const steps = Math.min(4, tiers.length - fromIndex);
    el.innerHTML = '';

    for (let i = 0; i < steps; i++) {
      const tier = tiers[fromIndex + i];
      const isCurrent = i === 0;

      // Orb size scales down for future steps.
      const orbPx = isCurrent ? 28 : Math.max(16, 28 - i * 4);

      const step = document.createElement('div');
      step.className = `evo-step${isCurrent ? ' evo-current' : ''}`;

      const orb = document.createElement('div');
      orb.className = 'evo-orb';
      orb.style.cssText = [
        `width:${orbPx}px`,
        `height:${orbPx}px`,
        `background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.85), ${tier.color} 55%, ${tier.shade ?? tier.color} 100%)`,
        isCurrent ? `box-shadow:0 0 0 2px ${tier.color},0 0 8px ${tier.color}66` : '',
      ].join(';');

      const label = document.createElement('span');
      label.className = 'evo-label';
      label.textContent = tier.name;

      // Score gain indicator for non-current steps
      if (i > 0) {
        const pts = document.createElement('span');
        pts.className = 'evo-pts';
        pts.textContent = `+${tier.score}`;
        step.appendChild(orb);
        step.appendChild(label);
        step.appendChild(pts);
      } else {
        step.appendChild(orb);
        step.appendChild(label);
      }

      el.appendChild(step);

      if (i < steps - 1) {
        const arrow = document.createElement('span');
        arrow.className = 'evo-arrow';
        arrow.textContent = '›';
        el.appendChild(arrow);
      }
    }

    // If the current fruit is the final tier, show a "MAX" badge.
    if (fromIndex >= tiers.length - 1) {
      el.innerHTML = '';
      const badge = document.createElement('span');
      badge.className = 'evo-max';
      badge.textContent = '🏆 MAX TIER';
      el.appendChild(badge);
    }
  }

  setDangerProgress(progress01) {
    if (this.dangerLineEl) this.dangerLineEl.style.opacity = String(Math.min(1, progress01 * 1.3));
    if (this.dangerVignetteEl) {
      this.dangerVignetteEl.style.opacity = String(Math.min(0.85, progress01 * progress01 * 1.1));
      this.dangerVignetteEl.classList.toggle('danger-vignette-active', progress01 > 0.02);
    }
  }

  reportLiveScore(score) {
    if (score > this.highScore) {
      this.highScore = score;
      this._saveHighScore(score);
      if (this.highScoreEl) this.highScoreEl.textContent = this.highScore;
    }
  }

  showGameOver(finalScore, sessionStats = {}) {
    const isNewHigh = finalScore > this.highScore;
    this.reportLiveScore(finalScore);
    if (this.finalHighScoreEl) this.finalHighScoreEl.textContent = this.highScore;
    if (this.newHighBadgeEl)   this.newHighBadgeEl.style.display = isNewHigh ? 'inline-block' : 'none';

    // Reset new-record banner so CSS animation replays cleanly each time.
    if (this.newRecordBannerEl) {
      this.newRecordBannerEl.classList.remove('is-active');
      this.newRecordBannerEl.textContent = '';
    }

    // Rank
    const rank = getRankForScore(finalScore);
    if (this.goRankEl)     this.goRankEl.textContent     = rank.emoji;
    if (this.goRankNameEl) this.goRankNameEl.textContent = rank.name;
    if (this.goRankNameEl) this.goRankNameEl.style.color = rank.color;

    const nextRankInfo = getNextRankInfo(finalScore);
    if (this.goNextRankEl) {
      this.goNextRankEl.textContent = nextRankInfo
        ? `${nextRankInfo.scoreNeeded} pts to ${nextRankInfo.rank.name}`
        : 'Max Rank — You are a Legend!';
    }

    // Session stats
    if (this.goMergesEl) this.goMergesEl.textContent = sessionStats.sessionMerges  ?? 0;
    if (this.goComboEl)  this.goComboEl.textContent  = `x${sessionStats.sessionBestCombo ?? 0}`;
    if (this.goCoinsEl)  this.goCoinsEl.textContent  = sessionStats.sessionCoins   ?? 0;
    if (this.goXpEl)     this.goXpEl.textContent     = sessionStats.sessionXP      ?? 0;

    if (this.gameOverEl) this.gameOverEl.classList.add('visible');
    this._animateScoreTally(finalScore, isNewHigh);

    if (isNewHigh) {
      this._triggerNewRecordSequence();
    }
  }

  _triggerNewRecordSequence() {
    const TALLY_MS = 900; // matches _animateScoreTally duration

    // Show the banner right after the score tally finishes.
    setTimeout(() => {
      if (this.newRecordBannerEl) {
        this.newRecordBannerEl.textContent = '🏆 NEW RECORD!';
        // Force reflow so the animation restarts even if it was active before.
        void this.newRecordBannerEl.offsetWidth;
        this.newRecordBannerEl.classList.add('is-active');
      }
    }, TALLY_MS + 40);

    // Three staggered confetti bursts.
    if (!this.confetti || !this.confettiCanvas) return;
    const cx = this.confettiCanvas.width / 2;
    const cy = this.confettiCanvas.height * 0.22;
    [TALLY_MS + 80, TALLY_MS + 520, TALLY_MS + 980].forEach((delay) => {
      setTimeout(() => this.confetti.burst(cx, cy, 75), delay);
    });
  }

  _animateScoreTally(target, isNewHigh = false) {
    const token = ++this._scoreTallyToken;
    const duration = 900;
    const start = performance.now();
    // Reset any previous record glow.
    this.finalScoreEl?.classList.remove('is-record');
    const step = (now) => {
      if (token !== this._scoreTallyToken) return;
      const t = Math.min(1, (now - start) / duration);
      const value = Math.round(lerp(0, target, easeOutQuad(t)));
      if (this.finalScoreEl) this.finalScoreEl.textContent = value;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        if (this.finalScoreEl) this.finalScoreEl.textContent = target;
        // Apply gold glow once tally reaches the final number.
        if (isNewHigh) this.finalScoreEl?.classList.add('is-record');
      }
    };
    requestAnimationFrame(step);
  }

  hideGameOver() {
    this.gameOverEl?.classList.remove('visible');
    this.confetti?.clear();
    // Clean up record state for the next game.
    this.finalScoreEl?.classList.remove('is-record');
    if (this.newRecordBannerEl) {
      this.newRecordBannerEl.classList.remove('is-active');
      this.newRecordBannerEl.textContent = '';
    }
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
    if (this.xpLevelLabelEl)    this.xpLevelLabelEl.textContent    = `Lv ${info.level}`;
    if (this.xpFractionLabelEl) this.xpFractionLabelEl.textContent = `${info.xpIntoLevel} / ${info.xpForNextLevel} XP`;
  }

  _handleXPChange(after, leveledUp) {
    this._renderXP(after);
    if (leveledUp && this.xpBarWrapEl) {
      this.xpBarWrapEl.classList.remove('level-up-flash');
      void this.xpBarWrapEl.offsetWidth;
      this.xpBarWrapEl.classList.add('level-up-flash');
    }
  }

  // ---- Coins display ---------------------------------------------------

  _initCoinsDisplay() {
    const totalCoinsEl = document.getElementById('total-coins-display');
    if (totalCoinsEl) totalCoinsEl.textContent = `🪙 ${getTotalCoins()}`;
    onCoinsChange((total) => {
      if (totalCoinsEl) totalCoinsEl.textContent = `🪙 ${total}`;
    });
  }

  // ---- Power Buttons ---------------------------------------------------

  _initPowerShop() {
    const container = document.getElementById('power-buttons');
    if (!container) return;
    // Buttons are rendered by updatePowerButtons
    this.updatePowerButtons();

    // Power shop buy buttons
    document.querySelectorAll('[data-buy-power]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.buyPower;
        const success = buyPower(id);
        if (success) {
          playClickSound();
          this.updatePowerButtons();
          this._initCoinsDisplay();
        } else {
          btn.classList.add('shake');
          setTimeout(() => btn.classList.remove('shake'), 320);
        }
      });
    });
  }

  updatePowerButtons() {
    const container = document.getElementById('power-buttons');
    if (!container) return;
    container.innerHTML = '';
    for (const def of POWER_DEFS) {
      const count = getPowerCount(def.id);
      const btn = document.createElement('button');
      btn.className = `power-btn${count === 0 ? ' power-btn-empty' : ''}`;
      btn.title = `${def.name}: ${def.desc}`;
      btn.innerHTML = `<span class="power-emoji">${def.emoji}</span><span class="power-count">${count}</span>`;
      btn.disabled = count === 0;
      btn.addEventListener('click', () => {
        if (count > 0) {
          playClickSound();
          this.onUsePower?.(def.id);
          this.updatePowerButtons();
        }
      });
      container.appendChild(btn);
    }
  }
}
