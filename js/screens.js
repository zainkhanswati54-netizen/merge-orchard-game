// ---------------------------------------------------------------------------
// SCREEN FLOW
// ---------------------------------------------------------------------------
// Owns navigation between the loading screen, main menu, and game screen,
// plus the Settings and Leaderboard overlays that can appear on top of
// either. Deliberately separate from game.js (which only cares about the
// merge loop itself) and ui.js (which only cares about the in-game HUD).
// ---------------------------------------------------------------------------

import { CONFIG } from './config.js';
import { getSettings, setSetting } from './settings.js';
import { getLeaderboard } from './leaderboard.js';
import { preloadAudio } from './audio.js';

const SCREEN_ELEMENT_ID = {
  loading: 'loading-screen',
  menu: 'main-menu',
  game: 'game-screen',
};

export function showScreen(name) {
  const targetId = SCREEN_ELEMENT_ID[name];
  for (const id of Object.values(SCREEN_ELEMENT_ID)) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('visible', id === targetId);
  }
}

function openOverlay(id) {
  document.getElementById(id)?.classList.add('visible');
}

function closeOverlay(id) {
  document.getElementById(id)?.classList.remove('visible');
}

function renderLeaderboard() {
  const listEl = document.getElementById('leaderboard-list');
  if (!listEl) return;
  const entries = getLeaderboard();

  if (!entries.length) {
    listEl.innerHTML = '<li class="leaderboard-empty">No scores yet — play a round!</li>';
    return;
  }

  listEl.innerHTML = entries
    .map(
      (entry, i) => `
        <li class="leaderboard-row${i === 0 ? ' is-top' : ''}">
          <span class="lb-rank">#${i + 1}</span>
          <span class="lb-score">${entry.score}</span>
        </li>`
    )
    .join('');
}

// Wires every button/slider across the menu, both overlays, and the in-game
// HUD's settings icon. onPlay/onPauseGame/onResumeGame are small hooks back
// into main.js, which is the only place that knows whether a Game instance
// exists yet.
export function initScreens({ onPlay, onPauseGame, onResumeGame } = {}) {
  document.getElementById('menu-play-btn')?.addEventListener('click', () => {
    showScreen('game');
    onPlay?.();
  });

  document.getElementById('menu-settings-btn')?.addEventListener('click', () => {
    openOverlay('settings-overlay');
  });

  document.getElementById('menu-leaderboard-btn')?.addEventListener('click', () => {
    renderLeaderboard();
    openOverlay('leaderboard-overlay');
  });

  // In-HUD settings icon — only relevant once a game is actually running,
  // so it also pauses play while the overlay is open.
  document.getElementById('hud-settings-btn')?.addEventListener('click', () => {
    onPauseGame?.();
    openOverlay('settings-overlay');
  });

  document.getElementById('settings-close-btn')?.addEventListener('click', () => {
    closeOverlay('settings-overlay');
    onResumeGame?.();
  });

  document.getElementById('leaderboard-close-btn')?.addEventListener('click', () => {
    closeOverlay('leaderboard-overlay');
  });

  // Volume sliders — initialize from saved settings, then persist + apply
  // live on every drag.
  const sfxSlider = document.getElementById('sfx-volume-slider');
  const musicSlider = document.getElementById('music-volume-slider');
  const current = getSettings();

  if (sfxSlider) {
    sfxSlider.value = Math.round(current.sfxVolume * 100);
    sfxSlider.addEventListener('input', () => {
      setSetting('sfxVolume', Number(sfxSlider.value) / 100);
    });
  }
  if (musicSlider) {
    musicSlider.value = Math.round(current.musicVolume * 100);
    musicSlider.addEventListener('input', () => {
      setSetting('musicVolume', Number(musicSlider.value) / 100);
    });
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

// Drives the loading screen's progress bar through real steps (fonts,
// audio decode) rather than faking a generic timer, with a minimum floor so
// it still reads as a real loading screen even on a fast connection.
export async function runLoadingSequence() {
  const startTime = performance.now();
  const bar = document.getElementById('loading-progress-bar');
  const pctEl = document.getElementById('loading-progress-pct');
  const statusEl = document.getElementById('loading-status');

  const setProgress = (pct, label) => {
    if (bar) bar.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
    if (statusEl && label) statusEl.textContent = label;
  };

  setProgress(8, 'Warming up the jar…');
  await delay(150);

  setProgress(35, 'Loading fonts…');
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      /* font loading failures shouldn't block the game */
    }
  }

  setProgress(70, 'Loading sound…');
  await preloadAudio(); // already resolves even on failure — see audio.js

  setProgress(95, 'Almost there…');
  await delay(150);

  setProgress(100, 'Ready!');

  const remaining = CONFIG.MIN_LOADING_SCREEN_MS - (performance.now() - startTime);
  if (remaining > 0) await delay(remaining);

  showScreen('menu');
}
