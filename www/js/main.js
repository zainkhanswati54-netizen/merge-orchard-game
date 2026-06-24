import { CONFIG } from './config.js';
import { Game } from './game.js';
import { initScreens, runLoadingSequence, showScreen, getChosenWeather,
         initChapterSelect, updateChapterBadge, initDailyLogin,
         showDailyLoginIfNeeded, openDailyLoginModal, renderOrchardTasks } from './screens.js';
import { getThemeById } from './themes.js';
import { getCurrentChapter, setCurrentChapter, completeChapter, ALL_CHAPTERS,
         getChapterBestScore, ORCHARD_AREAS } from './chapterSystem.js';
import { addCoins } from './coins.js';
import { addXP } from './xp.js';
import { initFearSystem, onFearChange, onFearFail, getFearState } from './fearSystem.js';
import { initBlight } from './blightSystem.js';
import { initLifeEnergy, setOrchardTier } from './lifeEnergy.js';

// ---------------------------------------------------------------------------
// Matter.js is loaded from a CDN via a plain <script> tag (see index.html),
// not as an ES module import, because physics.js expects the global
// `Matter` object. On a slow, flaky, or blocking network, that <script>
// tag can fail or simply not finish before this module runs. Previously
// that meant `new PhysicsWorld()` would throw on `const { Engine } = Matter`
// and silently kill the entire game with nothing on screen and no
// indication to the player of what went wrong.
//
// waitForMatter() polls for the global instead of assuming it's ready,
// giving the (already-attempted) fallback CDN script tags in index.html
// time to finish. If Matter truly never shows up, we surface a clear,
// retryable error screen instead of a blank canvas.
// ---------------------------------------------------------------------------
function waitForMatter(timeoutMs = 10000, pollMs = 100) {
  return new Promise((resolve, reject) => {
    if (typeof Matter !== 'undefined') {
      resolve();
      return;
    }
    const start = performance.now();
    const interval = setInterval(() => {
      if (typeof Matter !== 'undefined') {
        clearInterval(interval);
        resolve();
      } else if (performance.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Matter.js failed to load (engine timeout)'));
      }
    }, pollMs);
  });
}

function showEngineErrorOverlay(show) {
  const overlay = document.getElementById('engine-error-overlay');
  if (!overlay) return;
  overlay.classList.toggle('visible', show);
}

async function bootWhenMatterReady() {
  showEngineErrorOverlay(false);
  try {
    await waitForMatter();
    return true;
  } catch (err) {
    console.error('[boot] ' + err.message);
    showEngineErrorOverlay(true);
    return false;
  }
}

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = CONFIG.BOX_WIDTH * dpr;
  canvas.height = CONFIG.BOX_HEIGHT * dpr;
  canvas.style.width = '100%';
  canvas.style.aspectRatio = `${CONFIG.BOX_WIDTH} / ${CONFIG.BOX_HEIGHT}`;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
}

// Map chapter modifier → orchard theme id
function _themeForChapter(chapter) {
  const areaThemeMap = {
    'forgotten_field': 'classic',
    'apple_grove':     'classic',
    'cherry_valley':   'cherry_valley',
    'golden_orchard':  'tropical',
    'crystal_forest':  'mystic_forest',
    'sky_orchard':     'sky_islands',
    'eternal_orchard': 'cosmic',
  };
  return areaThemeMap[chapter.area] || 'classic';
}

window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('game-canvas');

  // Don't touch the canvas or build any game systems until we know the
  // physics engine is actually available. See waitForMatter() above.
  const matterReady = await bootWhenMatterReady();
  document.getElementById('engine-error-retry-btn')?.addEventListener('click', () => {
    location.reload();
  });
  if (!matterReady) {
    // Stop here — the error overlay is visible and explains what to do.
    // There is nothing safe to initialize without the physics engine.
    return;
  }

  setupCanvas(canvas);

  let game = null;
  let currentChapterObj = null;

  // ---- Fear meter UI ----
  onFearChange((state) => {
    const fearEl = document.getElementById('fear-meters');
    const overflowEl = document.getElementById('fear-overflow');
    const overflowFill = document.getElementById('fear-fill-overflow');
    const corruptionEl = document.getElementById('fear-corruption');
    const corruptionFill = document.getElementById('fear-fill-corruption');

    let anyActive = false;
    if (state.active.includes('overflow')) {
      if (overflowEl) overflowEl.style.display = '';
      if (overflowFill) {
        overflowFill.style.width = `${state.overflow}%`;
        overflowFill.classList.toggle('fear-critical', state.overflow > 70);
      }
      anyActive = true;
    }
    if (state.active.includes('corruption')) {
      if (corruptionEl) corruptionEl.style.display = '';
      if (corruptionFill) {
        corruptionFill.style.width = `${state.corruption}%`;
        corruptionFill.classList.toggle('fear-critical', state.corruption > 70);
      }
      anyActive = true;
    }
    if (fearEl) fearEl.style.display = anyActive ? '' : 'none';
  });

  onFearFail((type) => {
    // Fear failure causes chapter fail
    if (game) {
      game._handleGameOver?.();
    }
  });

  // ---- Chapter select ----
  function startChapter(chapter) {
    currentChapterObj = chapter;
    const themeId = _themeForChapter(chapter);
    const theme = getThemeById(themeId);
    showScreen('game');

    // Update chapter info bar
    const numEl = document.getElementById('chapter-info-num');
    const nameEl = document.getElementById('chapter-info-name');
    const modBadge = document.getElementById('chapter-modifier-badge');
    const pauseLabel = document.getElementById('pause-chapter-label');
    if (numEl) numEl.textContent = `Ch.${chapter.id}`;
    if (nameEl) nameEl.textContent = chapter.areaName;
    if (modBadge && chapter.modifier !== 'none') {
      modBadge.style.display = '';
      const mods = { limited_drops:'⏳ Limited Drops', time_limit:'⏱️ Time Attack',
                     wind_storm:'💨 Wind Storm', frozen_fruits:'❄️ Frozen',
                     dark_fruits:'🌑 Dark Mode', guardian_trial:'⚔️ Guardian Trial',
                     fruit_decay:'💀 Decay', mirror_mode:'🪞 Mirror', low_vis:'🌫️ Fog' };
      modBadge.textContent = mods[chapter.modifier] || chapter.modifier;
    } else if (modBadge) {
      modBadge.style.display = 'none';
    }
    if (pauseLabel) pauseLabel.textContent = `Chapter ${chapter.id} — ${chapter.areaName}`;

    // Set star targets
    _updateStarPips(0, chapter);

    // Init fear system (overflow always on, others by chapter modifier)
    const fearMeters = ['overflow'];
    if (chapter.modifier === 'fruit_decay') fearMeters.push('corruption');
    if (chapter.id % 25 === 0) fearMeters.push('darkness');
    initFearSystem(fearMeters);

    // Init Orchard story systems
    initLifeEnergy();
    setOrchardTier(chapter.id);
    // Blight is introduced in Chapter 2 (Apple Grove)
    const blightActive = chapter.id >= 11;
    initBlight(blightActive, chapter.id);

    const pref = getChosenWeather();
    const weatherOverride = (pref === 'auto') ? null : pref;
    if (!game) {
      game = new Game(canvas, theme, weatherOverride);
      window.__game = game;
    } else {
      game.restart(theme, weatherOverride);
    }

    // Hook game score changes for star display
    const origSetScore = game.ui.setScore.bind(game.ui);
    game.ui.setScore = (score) => {
      origSetScore(score);
      _updateStarPips(score, chapter);
    };

    // Hook game over to show chapter results
    const origShowGameOver = game.ui.showGameOver?.bind(game.ui);
  }

  function _updateStarPips(score, chapter) {
    if (!chapter) return;
    const targets = chapter.starsTarget;
    for (let i = 1; i <= 3; i++) {
      const pip = document.getElementById(`star-${i}`);
      if (pip) {
        const earned = score >= targets[i - 1];
        pip.textContent = earned ? '★' : '☆';
        pip.classList.toggle('earned', earned);
      }
    }
    const nextEl = document.getElementById('star-next-target');
    if (nextEl) {
      const nextTarget = targets.find(t => score < t);
      nextEl.textContent = nextTarget ? `Next ★: ${nextTarget.toLocaleString()}` : 'Max Stars!';
    }
  }

  // When chapter ends with a score (called from game over)
  window.__onChapterComplete = function(score) {
    if (!currentChapterObj) return;
    const result = completeChapter(currentChapterObj.id, score);

    // Show stars on game over
    const starsDisplay = document.getElementById('chapter-stars-display');
    if (starsDisplay) starsDisplay.style.display = 'flex';
    for (let i = 1; i <= 3; i++) {
      const el = document.getElementById(`big-star-${i}`);
      if (el) {
        el.textContent = i <= result.stars ? '★' : '☆';
        if (i <= result.stars) {
          setTimeout(() => el.classList.add('earned'), i * 200);
        }
      }
    }

    // Chapter reward
    if (result.stars > 0) {
      const rewardBlock = document.getElementById('chapter-reward-block');
      const rewardCoins = document.getElementById('chapter-reward-coins');
      const rewardXP = document.getElementById('chapter-reward-xp');
      const nextBtn = document.getElementById('game-over-next-chapter-btn');
      if (rewardBlock) rewardBlock.style.display = '';
      if (rewardCoins) rewardCoins.textContent = `🪙 +${currentChapterObj.reward.coins}`;
      if (rewardXP) rewardXP.textContent = `⭐ +${currentChapterObj.reward.xp} XP`;
      // Grant reward only if improved
      if (result.isNew || result.isNewBest) {
        addCoins(currentChapterObj.reward.coins);
        addXP(currentChapterObj.reward.xp);
      }
      // Next chapter button
      const nextChapter = ALL_CHAPTERS.find(c => c.id === currentChapterObj.id + 1);
      if (nextBtn && nextChapter) {
        nextBtn.style.display = '';
        nextBtn.onclick = () => {
          document.getElementById('game-over')?.classList.remove('visible');
          startChapter(nextChapter);
        };
      }
    }

    updateChapterBadge();
  };

  // ---- Daily login ----
  initDailyLogin((reward) => {
    addCoins(reward.coins);
    addXP(reward.xp);
    updateChapterBadge();
  });

  // ---- Wire new menu buttons ----
  document.getElementById('menu-daily-btn')?.addEventListener('click', () => {
    openDailyLoginModal();
  });

  document.getElementById('menu-chapters-btn')?.addEventListener('click', () => {
    showScreen('chapter-select');
    updateChapterBadge();
  });

  // ---- Wire mystery box ----
  document.getElementById('mystery-box-open-btn')?.addEventListener('click', () => {
    const overlay = document.getElementById('mystery-box-overlay');
    if (overlay) overlay.style.display = 'none';
    // Show result modal
    document.getElementById('mystery-result-overlay')?.classList.add('visible');
    document.getElementById('mystery-result-icon').textContent = '🎁';
    document.getElementById('mystery-result-reward').textContent = '🪙 +200 Bonus Coins!';
    addCoins(200);
  });
  document.getElementById('mystery-result-close')?.addEventListener('click', () => {
    document.getElementById('mystery-result-overlay')?.classList.remove('visible');
  });

  function startGame(themeId) {
    const chapter = getCurrentChapter();
    startChapter(chapter);
  }

  initChapterSelect((chapter) => {
    showScreen('game');
    startChapter(chapter);
  });

  initScreens({
    onSelectLevel: (themeId) => startGame(themeId),
    onPauseGame: () => game?.pause(),
    onResumeGame: () => game?.resume(),
    onRestartGame: () => {
      if (currentChapterObj) startChapter(currentChapterObj);
      else game?.restart();
    },
    onPlayBtn: () => {
      const chapter = getCurrentChapter();
      startChapter(chapter);
    },
  });

  // Missions overlay: also show orchard tasks
  document.getElementById('menu-missions-btn')?.addEventListener('click', () => {
    renderOrchardTasks();
  });

  await runLoadingSequence();

  // Show daily login after loading
  setTimeout(() => showDailyLoginIfNeeded(), 600);
  updateChapterBadge();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
