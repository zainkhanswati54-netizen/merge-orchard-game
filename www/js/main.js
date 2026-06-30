import { CONFIG } from './config.js';
import { Game } from './game.js';
import { initMissionSelectScreen, openMissionSelect, showMissionCompleteToast, refreshMissionSelectXP, showMissionGuide, hideGuide, updateIngameMissionBar } from './missionSelectUI.js';
import { trackMissionProgress, getActiveMission, setActiveMission, getMissionStars } from './missionSelect.js';
import { initScreens, runLoadingSequence, showScreen, getChosenWeather,
         initChapterSelect, updateChapterBadge, initDailyLogin, updateHudMissions, initChapterPopup,
         openDailyLoginModal, renderOrchardTasks } from './screens.js';
import { getThemeById } from './themes.js';
import { getCurrentChapter, setCurrentChapter, completeChapter, ALL_CHAPTERS,
         getChapterBestScore, ORCHARD_AREAS } from './chapterSystem.js';
import { addCoins } from './coins.js';
import { addXP } from './xp.js';
import { initFearSystem, onFearChange, onFearFail, getFearState } from './fearSystem.js';

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = CONFIG.BOX_WIDTH * dpr;
  canvas.height = CONFIG.BOX_HEIGHT * dpr;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
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
    updateHudMissions(); // show missions in HUD

    // Update chapter info bar
    const numEl = document.getElementById('chapter-info-num');
    const nameEl = document.getElementById('chapter-info-name');
    const modBadge = document.getElementById('chapter-modifier-badge');
    const pauseLabel = document.getElementById('pause-chapter-label');
    if (numEl) numEl.textContent = `Ch.${chapter.id}`;
    if (nameEl) nameEl.textContent = chapter.areaName;
    if (modBadge && chapter.modifier !== 'none') {
      modBadge.style.display = '';
      const mods = { limited_drops:'Limited Drops', time_limit:'Time Attack',
                     wind_storm:'Wind Storm', frozen_fruits:'Frozen',
                     dark_fruits:'Dark Mode', guardian_trial:'Guardian Trial',
                     fruit_decay:'Decay', mirror_mode:'Mirror', low_vis:'Fog' };
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
  window.__onChapterComplete = async function(score, sessionData = {}) {
    if (!currentChapterObj) return;
    const result = completeChapter(currentChapterObj.id, score);

    // Check if active mission was completed this session
    const activeMission = getActiveMission();
    if (activeMission && !activeMission.completed) {
      const { isMissionCompleted: isMDone, getMissionStars: getMStars } = window.__missionMod || {};
      if (isMDone?.(activeMission.id)) {
        // Award mission XP + coins
        addXP(activeMission.xpReward || 0);
        addCoins(activeMission.coinReward || 0);
        showMissionCompleteToast(activeMission);
        setActiveMission(null);
            // 2 stars (14 missions done) = unlock next chapter
        const { getMissionStars } = window.__missionMod || {};
        const mStars = getMissionStars?.(currentChapterObj.id) || 0;
        if (mStars >= 2) {
          // Unlock next chapter in chapter system too
          const nextId = currentChapterObj.id + 1;
          setCurrentChapter(nextId);
          updateChapterBadge();
        }
      }
    } else {
      setActiveMission(null);
    }

    // Track games played for mission
    trackActiveMission('games', 1);
    // Track noPower mission
    if (sessionData.powersUsed === 0 && score > 0) {
      trackActiveMission('noPower', score);
    }

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
      if (rewardCoins) rewardCoins.textContent = `+${currentChapterObj.reward.coins} Coins`;
      if (rewardXP) rewardXP.textContent = `+${currentChapterObj.reward.xp} XP`;
      // Grant reward only if improved
      if (result.isNew || result.isNewBest) {
        addCoins(currentChapterObj.reward.coins);
        addXP(currentChapterObj.reward.xp);
      }
      // Next chapter button
      const nextChapter = ALL_CHAPTERS.find(c => c.id === currentChapterObj.id + 1);
      if (nextBtn && nextChapter) {
        nextBtn.style.display = '';
        nextBtn.textContent = `Next Chapter →`;
        nextBtn.onclick = () => {
          document.getElementById('game-over')?.classList.remove('visible');
          currentChapterObj = nextChapter;
          openMissionSelect(nextChapter);
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
    document.getElementById('mystery-result-reward').textContent = '+200 Bonus Coins!';
    addCoins(200);
  });
  document.getElementById('mystery-result-close')?.addEventListener('click', () => {
    document.getElementById('mystery-result-overlay')?.classList.remove('visible');
  });

  function startGame(themeId) {
    const chapter = getCurrentChapter();
    startChapter(chapter);
  }

  // Expose mission module for game over handler
  const missionMod = await import('./missionSelect.js');
  window.__missionMod = missionMod;

  // Expose musicEngine globally for settings picker
  const musicEngMod = await import('./musicEngine.js');
  window.__musicEngine = musicEngMod;

  // Load saved music track
  try { const t = localStorage.getItem('music_track'); if (t) musicEngMod.setMusicTrack(t); } catch(e) {}

  // Load saved UI theme
  try { const th = localStorage.getItem('ui_theme') || 'dark-forest'; document.documentElement.setAttribute('data-ui-theme', th); } catch(e) {}

  initChapterSelect((chapter) => {
    currentChapterObj = chapter;
    openMissionSelect(chapter);
  });

  // Chapter popup — tap Ch.1 in HUD
  const { getDailyMissions, onMissionsChange } = await import('./dailyMissions.js');
  const refreshPopup = initChapterPopup(
    () => currentChapterObj || getCurrentChapter(),
    () => getDailyMissions()
  );
  onMissionsChange(() => { updateHudMissions(); refreshPopup?.(); });

  // Init mission select screen
  initMissionSelectScreen({
    onPlayMission: (mission) => {
      const chapter = currentChapterObj || getCurrentChapter();
      showScreen('game');
      // Show guide popup, then start game on dismiss
      showMissionGuide(mission, () => {
        startChapter(chapter);
        // Show in-game reminder bar
        const { getMissionProgress } = window.__missionMod || {};
        const prog = getMissionProgress?.(mission.id) || 0;
        updateIngameMissionBar(mission, prog);
      });
    },
    onFreePlay: () => {
      const chapter = currentChapterObj || getCurrentChapter();
      showScreen('game');
      hideGuide();
      updateIngameMissionBar(null, 0);
      startChapter(chapter);
    },
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
      // Flow: Play → Chapter Select → Mission Select → Game
      showScreen('chapter-select');
    },
  });

  // Missions overlay: also show orchard tasks
  document.getElementById('menu-missions-btn')?.addEventListener('click', () => {
    renderOrchardTasks();
  });

  await runLoadingSequence();

  // Daily login is now handled inside runLoadingSequence
  updateChapterBadge();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // ── Capacitor / Mobile app lifecycle ─────────────────────────────────
  // Stop audio when app goes to background, resume when comes back
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // App backgrounded — stop music and AudioContext
      try { stopMusicEngine(); } catch(e) {}
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        // Suspend all active AudioContexts
        if (window.__audioCtxRef) window.__audioCtxRef.suspend();
      } catch(e) {}
    } else {
      // App foregrounded — resume
      try {
        if (window.__audioCtxRef) window.__audioCtxRef.resume();
      } catch(e) {}
    }
  });

  // Capacitor-specific pause/resume events
  document.addEventListener('pause', () => {
    try { stopMusicEngine(); } catch(e) {}
  }, false);

  document.addEventListener('resume', () => {
    // Don't auto-restart music — user can interact to start it
  }, false);
});
