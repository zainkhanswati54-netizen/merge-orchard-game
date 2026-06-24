import { CONFIG } from './config.js';
import { getSettings, setSetting } from './settings.js';
import { ALL_CHAPTERS, ORCHARD_AREAS, isChapterUnlocked, getChapterStars,
         getChapterBestScore, getCurrentChapter, setCurrentChapter, getOverallProgress,
         getTotalStars, getAreaProgress } from './chapterSystem.js';
import { checkDailyLogin, claimLoginReward, getLoginRewardForDay, hasPendingLoginReward,
         getDailyTasks, claimTaskReward, getDailyReturnState } from './dailyReturn.js';
import { getLeaderboard } from './leaderboard.js';
import { preloadAudio, playClickSound } from './audio.js';
import { THEMES, isThemeUnlocked } from './themes.js';
import { getTotalXP, addXP, getLevelInfo } from './xp.js';
import { getTotalCoins, addCoins } from './coins.js';
import { getDailyMissions, claimMissionReward, getCompletedUnclaimedCount } from './dailyMissions.js';
import { ACHIEVEMENTS, isUnlocked } from './achievements.js';
import { POWER_DEFS, getPowerCount, buyPower } from './powers.js';
import { checkAndUpdateStreak, getStreak, getStreakTier } from './streak.js';
import { getWeeklyMissions, claimWeeklyReward, getWeeklyCompletedUnclaimedCount, getWeekTimeRemaining } from './weeklyMissions.js';
import { getAllSkills, getUnlockedSkills, getNextSkill } from './skillTree.js';
import { getAllBosses, isBossDefeated, getDefeatedCount, getGuardianProgress } from './bossManager.js';

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
  loading:       'loading-screen',
  story:         'story-screen',
  menu:          'main-menu',
  levelSelect:   'level-select-screen',
  'chapter-select': 'chapter-select-screen',
  hub:           'hub-screen',
  game:          'game-screen',
};

// Orchard zones — shown in the restoration bar based on XP level
const ORCHARD_ZONES = [
  { minLevel: 1,  label: 'The Forgotten Field',  icon: '🌱' },
  { minLevel: 5,  label: 'The Apple Grove',       icon: '🍎' },
  { minLevel: 10, label: 'Cherry Valley',          icon: '🍒' },
  { minLevel: 15, label: 'The Golden Orchard',    icon: '🌕' },
  { minLevel: 20, label: 'The Crystal Forest',    icon: '💎' },
  { minLevel: 25, label: 'The Sky Orchard',       icon: '☁️' },
  { minLevel: 30, label: 'The Eternal Orchard',   icon: '🌳' },
];

const STORY_SEEN_KEY = 'legend_orchard_story_seen';

export function showScreen(name) {
  const targetId = SCREEN_ELEMENT_ID[name];
  for (const id of Object.values(SCREEN_ELEMENT_ID)) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('visible', id === targetId);
  }
  if (name === 'menu') {
    _updateStreakDisplay();
    _updateOrchardRestoration();
    _updateMoreBadge();
  }
}

// ---------------------------------------------------------------------------
// ORCHARD RESTORATION PROGRESS
// ---------------------------------------------------------------------------
function _updateOrchardRestoration() {
  const { level } = getLevelInfo();
  const guardians = getGuardianProgress();

  // Restoration is based on: levels reached (max 30 levels = full) + guardians awakened
  const levelProgress = Math.min(level / 30, 1);
  const guardianBonus = (guardians.awakened / guardians.total) * 0.3;
  const totalPct = Math.min(Math.round((levelProgress * 0.7 + guardianBonus) * 100), 100);

  const fillEl = document.getElementById('orchard-restore-fill');
  const pctEl  = document.getElementById('orchard-restore-pct');
  const zoneEl = document.getElementById('orchard-restore-zone');

  if (fillEl) fillEl.style.width = `${totalPct}%`;
  if (pctEl)  pctEl.textContent  = `${totalPct}%`;

  if (zoneEl) {
    // Find the current zone
    let currentZone = ORCHARD_ZONES[0];
    for (const zone of ORCHARD_ZONES) {
      if (level >= zone.minLevel) currentZone = zone;
    }
    zoneEl.textContent = `${currentZone.icon} ${currentZone.label}`;
  }
}

// Also export so game.js can call it after level-up
export function updateOrchardRestoration() {
  _updateOrchardRestoration();
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
  _updateMoreBadge();
}

function _updateMoreBadge() {
  const moreBadge = document.getElementById('more-badge');
  if (!moreBadge) return;
  const missions = getCompletedUnclaimedCount();
  const weekly = getWeeklyCompletedUnclaimedCount();
  const total = missions + weekly;
  moreBadge.textContent = total;
  moreBadge.style.display = total > 0 ? 'inline-flex' : 'none';
}

export function initScreens({ onSelectLevel, onPauseGame, onResumeGame, onRestartGame, onPlayBtn } = {}) {
  document.getElementById('menu-more-btn')?.addEventListener('click', () => {
    playClickSound();
    showScreen('hub');
  });

  document.getElementById('hub-back-btn')?.addEventListener('click', () => {
    playClickSound();
    showScreen('menu');
  });

  document.getElementById('menu-play-btn')?.addEventListener('click', () => {
    playClickSound();
    if (onPlayBtn) { onPlayBtn(); return; }
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

  // Weekly missions
  document.getElementById('menu-weekly-btn')?.addEventListener('click', () => {
    playClickSound();
    renderWeeklyMissions();
    openOverlay('weekly-overlay');
  });
  document.getElementById('weekly-close-btn')?.addEventListener('click', () => {
    playClickSound();
    closeOverlay('weekly-overlay');
  });

  // Skill tree
  document.getElementById('menu-skilltree-btn')?.addEventListener('click', () => {
    playClickSound();
    renderSkillTree();
    openOverlay('skilltree-overlay');
  });
  document.getElementById('skilltree-close-btn')?.addEventListener('click', () => {
    playClickSound();
    closeOverlay('skilltree-overlay');
  });

  // Guardians (bosses)
  document.getElementById('menu-bosses-btn')?.addEventListener('click', () => {
    playClickSound();
    renderBosses();
    openOverlay('bosses-overlay');
  });
  document.getElementById('bosses-close-btn')?.addEventListener('click', () => {
    playClickSound();
    closeOverlay('bosses-overlay');
  });

  // Story screen button (from main menu)
  document.getElementById('menu-story-btn')?.addEventListener('click', () => {
    playClickSound();
    _initStoryScreen(() => showScreen('menu'));
    showScreen('story');
  });

  _initMenuBackgroundFruit();
  _updateMissionsBadge();
  _updateWeeklyBadge();
}

// ---------------------------------------------------------------------------
// STORY SCREEN
// ---------------------------------------------------------------------------
function _initStoryScreen(onComplete) {
  let currentPage = 0;
  const totalPages = 4;

  const pages    = document.querySelectorAll('.story-page');
  const dots     = document.querySelectorAll('.story-dot');
  const prevBtn  = document.getElementById('story-prev-btn');
  const nextBtn  = document.getElementById('story-next-btn');
  const skipBtn  = document.getElementById('story-skip-btn');

  function goToPage(n) {
    currentPage = Math.max(0, Math.min(n, totalPages - 1));

    pages.forEach((p, i) => p.classList.toggle('active', i === currentPage));
    dots.forEach((d, i) => d.classList.toggle('active', i === currentPage));

    if (prevBtn) prevBtn.style.visibility = currentPage === 0 ? 'hidden' : 'visible';
    if (nextBtn) {
      if (currentPage === totalPages - 1) {
        nextBtn.textContent = '✨ Begin Your Journey';
        nextBtn.classList.add('story-btn-final');
      } else {
        nextBtn.textContent = 'Next →';
        nextBtn.classList.remove('story-btn-final');
      }
    }
  }

  // Remove old listeners by cloning and replacing buttons
  function _replaceBtn(id) {
    const old = document.getElementById(id);
    if (!old) return null;
    const fresh = old.cloneNode(true);
    old.parentNode.replaceChild(fresh, old);
    return fresh;
  }
  const freshPrev = _replaceBtn('story-prev-btn');
  const freshNext = _replaceBtn('story-next-btn');
  const freshSkip = _replaceBtn('story-skip-btn');

  freshPrev?.addEventListener('click', () => { playClickSound(); goToPage(currentPage - 1); });
  freshNext?.addEventListener('click', () => {
    playClickSound();
    if (currentPage === totalPages - 1) {
      try { localStorage.setItem(STORY_SEEN_KEY, '1'); } catch(e) {}
      onComplete();
    } else {
      goToPage(currentPage + 1);
    }
  });
  freshSkip?.addEventListener('click', () => {
    playClickSound();
    try { localStorage.setItem(STORY_SEEN_KEY, '1'); } catch(e) {}
    onComplete();
  });

  // Dot clicks
  dots.forEach((dot, i) => {
    const freshDot = dot.cloneNode(true);
    dot.parentNode.replaceChild(freshDot, dot);
    freshDot.addEventListener('click', () => { playClickSound(); goToPage(i); });
  });

  // Re-query after replacement
  const freshPrevRef = document.getElementById('story-prev-btn');
  if (freshPrevRef) freshPrevRef.style.visibility = 'hidden';

  goToPage(0);
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

  setProgress(10, 'Awakening the orchard…');
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch (e) {}
  }
  setProgress(50, 'Calling the guardians…');
  await preloadAudio();
  setProgress(100, 'The Keeper is ready!');

  // Check streak before revealing the menu so the display is ready immediately.
  const { streak, isNew } = checkAndUpdateStreak();

  // Show story on first ever launch; otherwise go straight to menu
  let storySeen = false;
  try { storySeen = !!localStorage.getItem(STORY_SEEN_KEY); } catch(e) {}

  if (!storySeen) {
    _initStoryScreen(() => {
      showScreen('menu');
      if (isNew && streak >= 1) {
        setTimeout(() => _showStreakToast(streak, getStreakTier()), 600);
      }
    });
    showScreen('story');
  } else {
    showScreen('menu');
    if (isNew && streak >= 1) {
      setTimeout(() => _showStreakToast(streak, getStreakTier()), 600);
    }
  }
}

function _updateWeeklyBadge() {
  const badge = document.getElementById('weekly-badge');
  const count = getWeeklyCompletedUnclaimedCount();
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
  _updateMoreBadge();
}

function renderWeeklyMissions() {
  const listEl = document.getElementById('weekly-list');
  const timeEl = document.getElementById('weekly-time-remaining');
  if (!listEl) return;

  if (timeEl) timeEl.textContent = `Resets in ${getWeekTimeRemaining()}`;

  const missions = getWeeklyMissions();
  listEl.innerHTML = '';
  for (const m of missions) {
    const pct = Math.round((m.progress / m.target) * 100);
    const div = document.createElement('div');
    div.className = `mission-item${m.completed ? ' mission-done' : ''}`;
    div.innerHTML = `
      <div class="mission-header">
        <span class="mission-desc">${m.icon} ${m.desc}</span>
        <span class="mission-progress-txt">${m.progress.toLocaleString()}/${m.target.toLocaleString()}</span>
      </div>
      <div class="mission-bar-track"><div class="mission-bar-fill" style="width:${pct}%"></div></div>
      <div class="mission-reward">
        🪙 ${m.reward.coins.toLocaleString()} · ⭐ ${m.reward.xp.toLocaleString()} XP
        ${m.completed && !m.rewardClaimed
          ? `<button class="mission-claim-btn" data-wid="${m.id}">Claim!</button>`
          : m.rewardClaimed ? '<span class="mission-claimed">✓ Claimed</span>' : ''}
      </div>
    `;
    listEl.appendChild(div);
  }

  listEl.querySelectorAll('.mission-claim-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const reward = claimWeeklyReward(btn.dataset.wid);
      if (reward) {
        playClickSound();
        addCoins(reward.coins);
        addXP(reward.xp);
        renderWeeklyMissions();
        _updateWeeklyBadge();
      }
    });
  });
}

function renderSkillTree() {
  const listEl = document.getElementById('skilltree-list');
  const labelEl = document.getElementById('skilltree-level-label');
  if (!listEl) return;

  const { level } = getLevelInfo();
  if (labelEl) labelEl.textContent = `Your Level: ${level}`;

  const skills = getAllSkills();
  listEl.innerHTML = '';

  for (const skill of skills) {
    const unlocked = level >= skill.level;
    const div = document.createElement('div');
    div.className = `achievement-item${unlocked ? ' achievement-done' : ' achievement-locked'}`;
    div.innerHTML = `
      <span class="ach-emoji">${unlocked ? skill.emoji : '🔒'}</span>
      <div class="ach-info">
        <div class="ach-name">${unlocked ? skill.name : `Level ${skill.level} — ???`}</div>
        <div class="ach-desc">${unlocked ? skill.desc : `Reach Level ${skill.level} to unlock`}</div>
        ${unlocked ? `<div class="ach-desc" style="color:#A8E6CF;margin-top:2px;">Type: ${skill.type === 'passive' ? '⚡ Passive' : '🎯 Active'}</div>` : ''}
      </div>
    `;
    listEl.appendChild(div);
  }
}

function renderBosses() {
  const listEl = document.getElementById('bosses-list');
  if (!listEl) return;

  const bosses = getAllBosses();
  const { level } = getLevelInfo();
  listEl.innerHTML = '';

  for (const boss of bosses) {
    const defeated = isBossDefeated(boss.id);
    const isAccessible = level >= boss.level;
    const div = document.createElement('div');
    div.className = `achievement-item guardian-item${defeated ? ' achievement-done' : isAccessible ? ' guardian-awakening' : ' achievement-locked'}`;
    div.innerHTML = `
      <span class="ach-emoji" style="font-size:1.8rem;">${defeated ? boss.emoji : isAccessible ? '⚔️' : '🔒'}</span>
      <div class="ach-info">
        <div class="ach-name" style="${defeated ? 'color:#A8E6CF' : ''}">
          ${defeated ? '✨ ' : ''}${boss.name}
          ${boss.area ? `<span style="font-size:0.7rem;color:#888;margin-left:6px;">— ${boss.area}</span>` : ''}
        </div>
        <div class="ach-desc">${isAccessible ? boss.desc : `Awakens at Keeper Level ${boss.level}`}</div>
        ${isAccessible && boss.power ? `
          <div class="ach-desc" style="color:#A8E6CF;margin-top:3px;">
            ✨ Power: ${boss.power}
          </div>` : ''}
        ${isAccessible ? `
          <div class="ach-desc" style="color:#FF6B35;margin-top:3px;">
            ${defeated
              ? `🏆 Awakened! Reward: 🪙 ${boss.reward.coins} · 🌿 ${boss.reward.xp} XP`
              : `Needs ${boss.hpRequired} merges to awaken · Reward: 🪙 ${boss.reward.coins} · 🌿 ${boss.reward.xp} XP`}
          </div>` : ''}
      </div>
    `;
    listEl.appendChild(div);
  }

  const defeatedCount = getDefeatedCount();
  const summary = document.createElement('div');
  summary.className = 'guardian-summary';
  summary.innerHTML = `
    <span>Guardians Awakened:</span>
    <strong>${defeatedCount} / ${bosses.length}</strong>
    ${defeatedCount === bosses.length ? '<div style="color:#A8E6CF;margin-top:4px;">🌳 The Eternal Orchard is restored!</div>' : ''}
  `;
  listEl.appendChild(summary);
}

// ---------------------------------------------------------------------------
// CHAPTER SELECT — new in v2
// ---------------------------------------------------------------------------
// ---- Chapter Select ----
let _selectedArea = 'forgotten_field';
let _onChapterSelect = null;

export function initChapterSelect(onSelect) {
  _onChapterSelect = onSelect;
  _buildAreaTabs();
  _renderChapterGrid(_selectedArea);

  document.getElementById('chapter-select-back-btn')?.addEventListener('click', () => {
    playClickSound();
    showScreen('menu');
  });
}

function _buildAreaTabs() {
  const container = document.getElementById('area-tabs');
  if (!container) return;
  container.innerHTML = '';
  for (const area of ORCHARD_AREAS) {
    const btn = document.createElement('button');
    btn.className = `area-tab${area.id === _selectedArea ? ' is-active' : ''}`;
    btn.textContent = `${area.icon} ${area.name}`;
    btn.addEventListener('click', () => {
      playClickSound();
      _selectedArea = area.id;
      container.querySelectorAll('.area-tab').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      _renderChapterGrid(area.id);
    });
    container.appendChild(btn);
  }
}

function _renderChapterGrid(areaId) {
  const grid = document.getElementById('chapter-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const chapters = ALL_CHAPTERS.filter(c => c.area === areaId);
  const current = getCurrentChapter();

  for (const ch of chapters) {
    const unlocked = isChapterUnlocked(ch.id);
    const stars = getChapterStars(ch.id);
    const isCurrent = ch.id === current.id;
    const isBoss = ch.isBossLevel;

    const cell = document.createElement('button');
    cell.className = [
      'chapter-cell',
      unlocked ? '' : 'is-locked',
      isBoss ? 'is-boss' : '',
      isCurrent ? 'is-current' : '',
    ].filter(Boolean).join(' ');
    cell.type = 'button';

    const starsText = stars === 0 ? '☆☆☆' : '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const modInfo = ch.modifier !== 'none' ? `<span class="chapter-cell-modifier">${ch.modifier === 'guardian_trial' ? '⚔️' : ''}</span>` : '';

    cell.innerHTML = `
      ${modInfo}
      ${isBoss ? `<span class="chapter-cell-boss-icon">⚔️</span>` : `<span class="chapter-cell-num">${ch.id}</span>`}
      <span class="chapter-cell-stars">${starsText}</span>
    `;

    if (unlocked) {
      cell.addEventListener('click', () => {
        playClickSound();
        setCurrentChapter(ch.id);
        _onChapterSelect?.(ch);
      });
    }
    grid.appendChild(cell);
  }

  // Update total stars display
  const starsEl = document.getElementById('chapter-total-stars');
  if (starsEl) starsEl.textContent = `⭐ ${getTotalStars()}`;
}

export function refreshChapterSelect() {
  _buildAreaTabs();
  _renderChapterGrid(_selectedArea);
}

// ---- Chapter badge on menu ----
export function updateChapterBadge() {
  const progress = getOverallProgress();
  const el = document.getElementById('chapter-badge-text');
  const starsEl = document.getElementById('chapter-badge-stars');
  if (el) el.textContent = `Chapter ${progress.completedChapters + 1} of 150`;
  if (starsEl) starsEl.textContent = `⭐ ${progress.totalStars}/450`;

  // Count badge
  const countBadge = document.getElementById('chapter-count-badge');
  if (countBadge) countBadge.textContent = `${progress.completedChapters}/150`;
}

// ---- Daily Login ----
export function initDailyLogin(onClaim) {
  const overlay = document.getElementById('daily-login-overlay');
  const claimBtn = document.getElementById('daily-claim-btn');

  claimBtn?.addEventListener('click', () => {
    playClickSound();
    const reward = claimLoginReward();
    if (reward) {
      onClaim?.(reward);
    }
    // Always close the overlay on button click, claimed or not
    overlay?.classList.remove('visible');
    _updateDailyReadyBadge();
  });

  _updateDailyReadyBadge();
}

export function showDailyLoginIfNeeded() {
  const loginData = checkDailyLogin();
  _updateDailyReadyBadge();

  if (loginData.isNew && hasPendingLoginReward()) {
    _renderDailyLoginModal(loginData.streakDay);
    document.getElementById('daily-login-overlay')?.classList.add('visible');
  }
}

function _renderDailyLoginModal(streakDay) {
  const reward = getLoginRewardForDay(streakDay);
  const subtitleEl = document.getElementById('daily-login-streak-text');
  const calEl = document.getElementById('daily-calendar');
  const coinsEl = document.getElementById('daily-reward-coins');
  const xpEl = document.getElementById('daily-reward-xp');
  const bonusEl = document.getElementById('daily-reward-bonus');

  if (subtitleEl) subtitleEl.textContent = reward.label;
  if (coinsEl) coinsEl.querySelector('span').textContent = reward.coins;
  if (xpEl) xpEl.querySelector('span').textContent = `${reward.xp} XP`;

  if (bonusEl) {
    if (reward.bonus) {
      bonusEl.style.display = '';
      bonusEl.textContent = `🎁 BONUS: ${reward.bonus.replace('_', ' ').toUpperCase()}!`;
    } else {
      bonusEl.style.display = 'none';
    }
  }

  // Calendar
  if (calEl) {
    calEl.innerHTML = '';
    for (let d = 1; d <= 7; d++) {
      const r = getLoginRewardForDay(d);
      const dayEl = document.createElement('div');
      dayEl.className = `daily-cal-day${d < streakDay ? ' is-claimed' : d === streakDay ? ' is-today' : ''}`;
      const icons = ['🍒','🍓','🍊','🍎','🍇','🥭','🌟'];
      dayEl.innerHTML = `<span class="daily-cal-day-icon">${d <= streakDay ? '✅' : icons[d-1]}</span><span class="daily-cal-day-label">Day ${d}</span>`;
      calEl.appendChild(dayEl);
    }
  }
}

function _updateDailyReadyBadge() {
  const badge = document.getElementById('daily-ready-badge');
  if (badge) badge.style.display = hasPendingLoginReward() ? 'flex' : 'none';
}

export function openDailyLoginModal() {
  const state = getDailyReturnState();
  _renderDailyLoginModal(state.streakDay || 1);
  document.getElementById('daily-login-overlay')?.classList.add('visible');
}

// ---- Orchard Tasks in Missions overlay ----
export function renderOrchardTasks() {
  const listEl = document.getElementById('orchard-tasks-list');
  if (!listEl) return;
  const tasks = getDailyTasks();
  listEl.innerHTML = '';
  for (const task of tasks) {
    const pct = Math.round((task.progress / task.target) * 100);
    const div = document.createElement('div');
    div.className = `mission-item${task.completed ? ' mission-done' : ''}`;
    div.innerHTML = `
      <div class="mission-header">
        <span class="mission-desc">${task.desc}</span>
        <span class="mission-progress-txt">${task.progress}/${task.target}</span>
      </div>
      <div class="mission-bar-track"><div class="mission-bar-fill" style="width:${pct}%"></div></div>
      <div class="mission-reward">
        🪙 ${task.reward.coins} · ⭐ ${task.reward.xp} XP
        ${task.completed && !task.claimed
          ? `<button class="mission-claim-btn" data-id="${task.id}">Claim!</button>`
          : task.claimed ? '<span class="mission-claimed">✓ Claimed</span>' : ''}
      </div>
    `;
    listEl.appendChild(div);
  }
  listEl.querySelectorAll('.mission-claim-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playClickSound();
      const r = claimTaskReward(btn.dataset.id);
      if (r) { addCoins(r.coins); addXP(r.xp); renderOrchardTasks(); }
    });
  });
}
