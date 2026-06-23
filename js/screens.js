import { CONFIG } from './config.js';
import { getSettings, setSetting } from './settings.js';
import { getLeaderboard } from './leaderboard.js';
import { preloadAudio, playClickSound } from './audio.js';
import { THEMES, isThemeUnlocked } from './themes.js';
import { getTotalXP, addXP } from './xp.js';
import { getTotalCoins, addCoins } from './coins.js';
import { getDailyMissions, claimMissionReward, getCompletedUnclaimedCount } from './dailyMissions.js';
import { ACHIEVEMENTS, isUnlocked } from './achievements.js';
import { POWER_DEFS, getPowerCount, buyPower } from './powers.js';
import { checkAndUpdateStreak, getStreak, getStreakTier } from './streak.js';

// ---------------------------------------------------------------------------
// Weather preference (persisted across sessions)
// ---------------------------------------------------------------------------
const WEATHER_OPTS = [
  { value: 'auto',   icon: '🎲', label: 'Auto'   },
  { value: 'none',   icon: '☀️',  label: 'Clear'  },
  { value: 'rain',   icon: '🌧️',  label: 'Rain'   },
  { value: 'snow',   icon: '❄️',  label: 'Snow'   },
  { value: 'meteor', icon: '☄️',  label: 'Meteor' },
];
const WEATHER_PREF_KEY = 'merge_weather_pref';

let _chosenWeather = localStorage.getItem(WEATHER_PREF_KEY) || 'auto';

export function getChosenWeather() { return _chosenWeather; }

function _setWeatherPref(val) {
  _chosenWeather = val;
  localStorage.setItem(WEATHER_PREF_KEY, val);
}

const SCREEN_ELEMENT_ID = {
  loading:     'loading-screen',
  menu:        'main-menu',
  levelSelect: 'level-select-screen',
  game:        'game-screen',
};

export function showScreen(name) {
  const targetId = SCREEN_ELEMENT_ID[name];
  for (const id of Object.values(SCREEN_ELEMENT_ID)) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('visible', id === targetId);
  }
  if (name === 'menu') _updateStreakDisplay();
}

function _updateStreakDisplay() {
  const el = document.getElementById('streak-display');
  if (!el) return;
  const streak = getStreak();
  if (streak < 1) { el.style.display = 'none'; return; }
  const tier = getStreakTier();
  el.style.display = 'flex';
  const multLabel = tier.mult > 1 ? ` · <span class="streak-mult">${tier.label} coins</span>` : '';
  el.innerHTML = `<span class="streak-flame">🔥</span><span class="streak-count">${streak}-day streak</span>${multLabel}`;
}

function _showStreakToast(streak, tier) {
  const toast = document.createElement('div');
  toast.className = 'streak-toast';
  const multNote = tier.mult > 1 ? ` — ${tier.label} coins!` : '';
  toast.textContent = `🔥 ${streak}-day streak${multNote}`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('visible'));
  });
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

function openOverlay(id)  { document.getElementById(id)?.classList.add('visible'); }
function closeOverlay(id) { document.getElementById(id)?.classList.remove('visible'); }

function renderLeaderboard() {
  const listEl = document.getElementById('leaderboard-list');
  if (!listEl) return;
  const entries = getLeaderboard();
  if (!entries.length) {
    listEl.innerHTML = '<li class="leaderboard-empty">No scores yet — play a round!</li>';
    return;
  }
  listEl.innerHTML = entries
    .map((entry, i) => `
      <li class="leaderboard-row${i === 0 ? ' is-top' : ''}">
        <span class="lb-rank">#${i + 1}</span>
        <span class="lb-score">${entry.score}</span>
      </li>`)
    .join('');
}

function renderWeatherPicker() {
  const container = document.getElementById('weather-picker');
  if (!container) return;
  container.innerHTML = '';
  for (const opt of WEATHER_OPTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `weather-opt-btn${_chosenWeather === opt.value ? ' is-selected' : ''}`;
    btn.title = opt.label;
    btn.innerHTML = `<span class="weather-opt-icon">${opt.icon}</span><span class="weather-opt-label">${opt.label}</span>`;
    btn.addEventListener('click', () => {
      playClickSound();
      _setWeatherPref(opt.value);
      renderWeatherPicker();
    });
    container.appendChild(btn);
  }
}

function renderLevelSelect(onSelect) {
  const listEl = document.getElementById('level-select-list');
  if (!listEl) return;
  const totalXP = getTotalXP();

  // Inject weather picker strip above the cards if not yet in DOM
  let pickerSection = document.getElementById('weather-picker-section');
  if (!pickerSection) {
    pickerSection = document.createElement('div');
    pickerSection.id = 'weather-picker-section';
    pickerSection.innerHTML = `
      <p class="weather-picker-label">🌤 Weather</p>
      <div id="weather-picker" class="weather-picker"></div>
    `;
    listEl.parentElement.insertBefore(pickerSection, listEl);
  }
  renderWeatherPicker();

  listEl.innerHTML = '';
  for (const theme of THEMES) {
    const unlocked = isThemeUnlocked(theme, totalXP);
    const card = document.createElement('button');
    card.className = `level-card${unlocked ? '' : ' is-locked'}`;
    card.type = 'button';
    const fruitDots = theme.tiers.slice(0, 4)
      .map((t) => `<span class="level-card-dot" style="background:${t.color}"></span>`)
      .join('');
    card.innerHTML = `
      <div class="level-card-main">
        <div class="level-card-name">${unlocked ? '' : '🔒 '}${theme.name}</div>
        <div class="level-card-desc">${theme.description}</div>
        <div class="level-card-dots">${fruitDots}</div>
      </div>
      ${unlocked ? '' : `<div class="level-card-lock-label">Unlocks at ${theme.unlockXP} XP</div>`}
    `;
    if (unlocked) {
      card.addEventListener('click', () => { playClickSound(); onSelect(theme.id); });
    } else {
      card.addEventListener('click', () => {
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
      });
    }
    listEl.appendChild(card);
  }
}

function renderDailyMissions() {
  const listEl = document.getElementById('missions-list');
  if (!listEl) return;
  const missions = getDailyMissions();
  listEl.innerHTML = '';
  for (const m of missions) {
    const pct = Math.round((m.progress / m.target) * 100);
    const li = document.createElement('div');
    li.className = `mission-item${m.completed ? ' mission-done' : ''}`;
    li.innerHTML = `
      <div class="mission-header">
        <span class="mission-desc">${m.desc}</span>
        <span class="mission-progress-txt">${m.progress}/${m.target}</span>
      </div>
      <div class="mission-bar-track"><div class="mission-bar-fill" style="width:${pct}%"></div></div>
      <div class="mission-reward">
        🪙 ${m.reward.coins} · ⭐ ${m.reward.xp} XP
        ${m.completed && !m.rewardClaimed
          ? `<button class="mission-claim-btn" data-id="${m.id}">Claim!</button>`
          : m.rewardClaimed ? '<span class="mission-claimed">✓ Claimed</span>' : ''}
      </div>
    `;
    listEl.appendChild(li);
  }

  // Wire claim buttons
  listEl.querySelectorAll('.mission-claim-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const reward = claimMissionReward(btn.dataset.id);
      if (reward) {
        playClickSound();
        addCoins(reward.coins);
        addXP(reward.xp);
        renderDailyMissions();
      }
    });
  });

  // Update badge on missions button
  _updateMissionsBadge();
}

function renderAchievements() {
  const listEl = document.getElementById('achievements-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  for (const ach of ACHIEVEMENTS) {
    const done = isUnlocked(ach.id);
    const div = document.createElement('div');
    div.className = `achievement-item${done ? ' achievement-done' : ' achievement-locked'}`;
    div.innerHTML = `
      <span class="ach-emoji">${done ? ach.emoji : '🔒'}</span>
      <div class="ach-info">
        <div class="ach-name">${ach.name}</div>
        <div class="ach-desc">${done ? ach.desc : '???'}</div>
      </div>
    `;
    listEl.appendChild(div);
  }
}

function renderPowerShop() {
  const listEl = document.getElementById('shop-list');
  if (!listEl) return;
  const coins = getTotalCoins();
  listEl.innerHTML = '';
  for (const def of POWER_DEFS) {
    const count = getPowerCount(def.id);
    const canAfford = coins >= def.cost;
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <span class="shop-emoji">${def.emoji}</span>
      <div class="shop-info">
        <div class="shop-name">${def.name} <span class="shop-count">x${count}</span></div>
        <div class="shop-desc">${def.desc}</div>
      </div>
      <button class="shop-buy-btn${canAfford ? '' : ' shop-btn-disabled'}" data-buy-power="${def.id}">
        🪙 ${def.cost}
      </button>
    `;
    listEl.appendChild(div);
  }

  listEl.querySelectorAll('[data-buy-power]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const success = buyPower(btn.dataset.buyPower);
      if (success) {
        playClickSound();
        renderPowerShop();
        document.getElementById('shop-coins-display').textContent = `🪙 ${getTotalCoins()}`;
      } else {
        btn.classList.add('shake');
        setTimeout(() => btn.classList.remove('shake'), 320);
      }
    });
  });
}

function _updateMissionsBadge() {
  const badge = document.getElementById('missions-badge');
  const count = getCompletedUnclaimedCount();
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
}

export function initScreens({ onSelectLevel, onPauseGame, onResumeGame, onRestartGame } = {}) {
  document.getElementById('menu-play-btn')?.addEventListener('click', () => {
    playClickSound();
    renderLevelSelect(onSelectLevel);
    showScreen('levelSelect');
  });

  document.getElementById('level-select-back-btn')?.addEventListener('click', () => {
    playClickSound();
    showScreen('menu');
  });

  document.getElementById('menu-guide-btn')?.addEventListener('click', () => {
    playClickSound();
    renderEncyclopedia();
    openOverlay('encyclopedia-overlay');
  });

  document.getElementById('encyclopedia-close-btn')?.addEventListener('click', () => {
    playClickSound();
    closeOverlay('encyclopedia-overlay');
  });

  document.getElementById('menu-settings-btn')?.addEventListener('click', () => {
    playClickSound();
    openOverlay('settings-overlay');
  });

  document.getElementById('menu-leaderboard-btn')?.addEventListener('click', () => {
    playClickSound();
    renderLeaderboard();
    openOverlay('leaderboard-overlay');
  });

  document.getElementById('menu-missions-btn')?.addEventListener('click', () => {
    playClickSound();
    renderDailyMissions();
    openOverlay('missions-overlay');
  });

  document.getElementById('menu-achievements-btn')?.addEventListener('click', () => {
    playClickSound();
    renderAchievements();
    openOverlay('achievements-overlay');
  });

  document.getElementById('menu-shop-btn')?.addEventListener('click', () => {
    playClickSound();
    const el = document.getElementById('shop-coins-display');
    if (el) el.textContent = `🪙 ${getTotalCoins()}`;
    renderPowerShop();
    openOverlay('shop-overlay');
  });

  // Hud pause btn
  document.getElementById('hud-pause-btn')?.addEventListener('click', () => {
    playClickSound();
    onPauseGame?.();
    openOverlay('pause-overlay');
  });

  document.getElementById('pause-resume-btn')?.addEventListener('click', () => {
    playClickSound();
    closeOverlay('pause-overlay');
    onResumeGame?.();
  });

  document.getElementById('pause-restart-btn')?.addEventListener('click', () => {
    playClickSound();
    closeOverlay('pause-overlay');
    onRestartGame?.();
  });

  document.getElementById('pause-settings-btn')?.addEventListener('click', () => {
    playClickSound();
    openOverlay('settings-overlay');
  });

  document.getElementById('pause-home-btn')?.addEventListener('click', () => {
    playClickSound();
    closeOverlay('pause-overlay');
    showScreen('menu');
  });

  document.getElementById('settings-close-btn')?.addEventListener('click', () => {
    playClickSound();
    closeOverlay('settings-overlay');
    const pauseMenuOpen = document.getElementById('pause-overlay')?.classList.contains('visible');
    if (!pauseMenuOpen) onResumeGame?.();
  });

  document.getElementById('leaderboard-close-btn')?.addEventListener('click', () => {
    playClickSound();
    closeOverlay('leaderboard-overlay');
  });

  document.getElementById('missions-close-btn')?.addEventListener('click', () => {
    playClickSound();
    closeOverlay('missions-overlay');
  });

  document.getElementById('achievements-close-btn')?.addEventListener('click', () => {
    playClickSound();
    closeOverlay('achievements-overlay');
  });

  document.getElementById('shop-close-btn')?.addEventListener('click', () => {
    playClickSound();
    closeOverlay('shop-overlay');
  });

  document.getElementById('game-over-change-level-btn')?.addEventListener('click', () => {
    playClickSound();
    closeOverlay('game-over');
    renderLevelSelect(onSelectLevel);
    showScreen('levelSelect');
  });

  // Volume sliders
  const sfxSlider   = document.getElementById('sfx-volume-slider');
  const musicSlider = document.getElementById('music-volume-slider');
  const current = getSettings();
  if (sfxSlider) {
    sfxSlider.value = Math.round(current.sfxVolume * 100);
    sfxSlider.addEventListener('input', () => setSetting('sfxVolume', Number(sfxSlider.value) / 100));
  }
  if (musicSlider) {
    musicSlider.value = Math.round(current.musicVolume * 100);
    musicSlider.addEventListener('input', () => setSetting('musicVolume', Number(musicSlider.value) / 100));
  }

  _initMenuBackgroundFruit();
  _updateMissionsBadge();
}

function renderEncyclopedia() {
  const list = document.getElementById('encyclopedia-list');
  if (!list) return;
  const totalXP = getTotalXP();
  list.innerHTML = '';

  for (const theme of THEMES) {
    const unlocked = isThemeUnlocked(theme, totalXP);

    const section = document.createElement('div');
    section.className = `enc-section${unlocked ? '' : ' enc-locked'}`;

    // Section header
    const header = document.createElement('div');
    header.className = 'enc-header';
    if (unlocked) {
      header.innerHTML = `
        <span class="enc-name">${theme.name}</span>
        <span class="enc-desc">${theme.description}</span>
      `;
    } else {
      header.innerHTML = `
        <span class="enc-name">🔒 ${theme.name}</span>
        <span class="enc-unlock">Unlock at ${theme.unlockXP.toLocaleString()} XP</span>
      `;
    }
    section.appendChild(header);

    // Tier chain (only for unlocked orchards)
    if (unlocked) {
      const chain = document.createElement('div');
      chain.className = 'enc-chain';

      theme.tiers.forEach((tier, i) => {
        const step = document.createElement('div');
        step.className = 'enc-tier';

        const orbSize = Math.max(22, Math.min(44, Math.round(20 + tier.radius * 0.6)));
        const orb = document.createElement('div');
        orb.className = 'enc-orb';
        orb.style.cssText = [
          `width:${orbSize}px`,
          `height:${orbSize}px`,
          `background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.85), ${tier.color} 55%, ${tier.shade ?? tier.color} 100%)`,
          `animation-delay:${i * 140}ms`,
        ].join(';');

        const name = document.createElement('span');
        name.className = 'enc-tier-name';
        name.textContent = tier.name;

        const pts = document.createElement('span');
        pts.className = 'enc-tier-pts';
        pts.textContent = `+${tier.score}`;

        step.appendChild(orb);
        step.appendChild(name);
        step.appendChild(pts);
        chain.appendChild(step);

        // Arrow between steps (not after the last)
        if (i < theme.tiers.length - 1) {
          const arrow = document.createElement('span');
          arrow.className = 'enc-arrow';
          arrow.textContent = '›';
          chain.appendChild(arrow);
        }
      });

      // Max-tier badge
      const maxBadge = document.createElement('div');
      maxBadge.className = 'enc-max-badge';
      maxBadge.textContent = '🏆 MAX';
      chain.appendChild(maxBadge);

      section.appendChild(chain);
    }

    list.appendChild(section);
  }
}

function _initMenuBackgroundFruit() {
  document.querySelectorAll('#main-menu .bg-fruit').forEach((el) => {
    const duration = 5 + Math.random() * 3.5;
    const delay = -Math.random() * duration;
    el.style.animationDuration = `${duration.toFixed(2)}s`;
    el.style.animationDelay    = `${delay.toFixed(2)}s`;
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

export async function runLoadingSequence() {
  const bar      = document.getElementById('loading-progress-bar');
  const pctEl    = document.getElementById('loading-progress-pct');
  const statusEl = document.getElementById('loading-status');

  const setProgress = (pct, label) => {
    if (bar)      bar.style.width     = `${pct}%`;
    if (pctEl)    pctEl.textContent   = `${Math.round(pct)}%`;
    if (statusEl && label) statusEl.textContent = label;
  };

  setProgress(10, 'Warming up the jar…');
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch (e) {}
  }
  setProgress(50, 'Loading sounds…');
  await preloadAudio();
  setProgress(100, 'Ready!');

  // Check streak before revealing the menu so the display is ready immediately.
  const { streak, isNew } = checkAndUpdateStreak();
  showScreen('menu');

  // Show a slide-in toast for a new streak day (after a brief moment for the menu to paint).
  if (isNew && streak >= 1) {
    setTimeout(() => _showStreakToast(streak, getStreakTier()), 600);
  }
}
