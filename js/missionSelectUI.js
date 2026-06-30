// ===========================================================================
// MISSION SELECT UI v2 — Sequential missions, clean design
// ===========================================================================
import { getChapterMissions, setActiveMission, getActiveMission,
         getMissionProgress, isMissionCompleted, getChapterMissionStats,
         getMissionStars } from './missionSelect.js';
import { getLevelInfo } from './xp.js';

let _onPlayMission = null;
let _onFreePlay    = null;
let _currentChapter = null;

export function initMissionSelectScreen({ onPlayMission, onFreePlay }) {
  _onPlayMission = onPlayMission;
  _onFreePlay    = onFreePlay;

  document.getElementById('ms-back-btn')?.addEventListener('click', () => {
    import('./screens.js').then(m => m.showScreen('menu'));
  });

  document.getElementById('ms-freeplay-btn')?.addEventListener('click', () => {
    setActiveMission(null);
    _onFreePlay?.();
  });
}

export function openMissionSelect(chapter) {
  _currentChapter = chapter;

  const el = id => document.getElementById(id);

  // Header
  if (el('ms-chapter-name')) el('ms-chapter-name').textContent = chapter.name;
  if (el('ms-area-name'))    el('ms-area-name').textContent    = chapter.areaName;

  // XP bar
  _refreshXP();

  // Render missions
  _renderMissions(chapter);

  import('./screens.js').then(m => m.showScreen('mission-select-screen'));
}

function _refreshXP() {
  const el = id => document.getElementById(id);
  const lv = getLevelInfo();
  if (el('ms-level-num')) el('ms-level-num').textContent = `Lv. ${lv.level}`;
  if (el('ms-level-xp'))  el('ms-level-xp').textContent  = `${lv.xpIntoLevel} / ${lv.xpForNextLevel} XP`;
  if (el('ms-xp-fill'))   el('ms-xp-fill').style.width   = `${Math.round(lv.progress01 * 100)}%`;
}

function _renderMissions(chapter) {
  const list = document.getElementById('ms-mission-list');
  if (!list) return;
  list.innerHTML = '';

  const missions = getChapterMissions(chapter.id);
  const stats    = getChapterMissionStats(chapter.id);
  const stars    = getMissionStars(chapter.id);

  // Stars badge
  const badge = document.getElementById('ms-stars-badge');
  if (badge) badge.textContent = `${'⭐'.repeat(stars) || '☆☆☆'} ${stats.done}/20`;

  // Progress summary
  const el = id => document.getElementById(id);
  const easyDone = missions.filter(m => m.difficulty==='easy'   && m.completed).length;
  const medDone  = missions.filter(m => m.difficulty==='medium' && m.completed).length;
  const hardDone = missions.filter(m => m.difficulty==='hard'   && m.completed).length;
  if (el('ms-easy-done'))  el('ms-easy-done').textContent  = `${easyDone}/7`;
  if (el('ms-med-done'))   el('ms-med-done').textContent   = `${medDone}/7`;
  if (el('ms-hard-done'))  el('ms-hard-done').textContent  = `${hardDone}/6`;
  if (el('ms-total-done')) el('ms-total-done').textContent = `${stats.done}/20`;

  // Current active mission (first incomplete unlocked)
  const current = missions.find(m => m.isUnlocked && !m.completed);

  // Section: CURRENT MISSION
  if (current) {
    const prog    = getMissionProgress(current.id);
    const pct     = Math.min(100, Math.round((prog / current.target) * 100));
    const section = document.createElement('div');
    section.className = 'ms-section';
    section.innerHTML = `
      <div class="ms-section-title">🎯 Current Mission</div>
      <div class="ms-current-card diff-${current.difficulty}" id="ms-current-card">
        <div class="ms-current-top">
          <span class="ms-current-icon">${current.icon}</span>
          <div class="ms-current-info">
            <div class="ms-current-num">Mission ${current.missionNum} / 20</div>
            <div class="ms-current-label">${current.label}</div>
            <div class="ms-current-desc">${current.desc}</div>
          </div>
          <span class="ms-diff-badge ${current.difficulty}">${current.difficulty}</span>
        </div>
        <div class="ms-current-prog-row">
          <div class="ms-current-pct">${pct}%</div>
          <div class="ms-current-prog-track">
            <div class="ms-current-prog-fill diff-${current.difficulty}" style="width:${pct}%"></div>
          </div>
          <div class="ms-current-val">${prog}/${current.target}</div>
        </div>
        <div class="ms-current-rewards">
          <span class="ms-reward-pill">✨ +${current.xpReward} XP</span>
          <span class="ms-reward-pill">🪙 +${current.coinReward}</span>
        </div>
        <button class="ms-play-mission-btn" data-mission-id="${current.id}">
          ▶ Play This Mission
        </button>
      </div>
    `;
    list.appendChild(section);

    section.querySelector('.ms-play-mission-btn')?.addEventListener('click', () => {
      setActiveMission(current);
      _onPlayMission?.(current);
    });
  } else {
    // All done!
    const section = document.createElement('div');
    section.className = 'ms-section';
    section.innerHTML = `
      <div class="ms-all-done-card">
        <div style="font-size:36px;margin-bottom:8px;">🎉</div>
        <div class="ms-all-done-title">All Missions Complete!</div>
        <div class="ms-all-done-sub">You've mastered ${chapter.name}!</div>
        <div style="font-size:24px;margin-top:8px;">${'⭐'.repeat(stars)}</div>
      </div>
    `;
    list.appendChild(section);
  }

  // Section: COMPLETED (last 3 shown)
  const completed = missions.filter(m => m.completed);
  if (completed.length > 0) {
    const section = document.createElement('div');
    section.className = 'ms-section';
    const showing = completed.slice(-3).reverse();
    section.innerHTML = `
      <div class="ms-section-title">✅ Completed (${completed.length})</div>
      ${showing.map(m => `
        <div class="ms-done-card">
          <span class="ms-done-icon">${m.icon}</span>
          <div class="ms-done-info">
            <span class="ms-done-label">${m.label}</span>
            <span class="ms-done-desc">${m.desc}</span>
          </div>
          <span class="ms-done-check">✅</span>
        </div>
      `).join('')}
      ${completed.length > 3 ? `<div class="ms-more-done">+${completed.length-3} more completed</div>` : ''}
    `;
    list.appendChild(section);
  }

  // Section: LOCKED PREVIEW (next 2)
  const locked = missions.filter(m => !m.isUnlocked);
  if (locked.length > 0) {
    const section = document.createElement('div');
    section.className = 'ms-section';
    const preview = locked.slice(0, 2);
    section.innerHTML = `
      <div class="ms-section-title">🔒 Coming Next</div>
      ${preview.map(m => `
        <div class="ms-locked-card">
          <span class="ms-locked-icon">🔒</span>
          <div class="ms-locked-info">
            <span class="ms-locked-label">${m.label}</span>
            <span class="ms-locked-desc">Complete current mission to unlock</span>
          </div>
        </div>
      `).join('')}
      ${locked.length > 2 ? `<div class="ms-more-done">+${locked.length-2} more missions locked</div>` : ''}
    `;
    list.appendChild(section);
  }

  // Star unlock info
  const infoSection = document.createElement('div');
  infoSection.className = 'ms-star-info';
  infoSection.innerHTML = `
    <div class="ms-star-row ${stats.done>=7?'earned':''}">⭐ <span>7 missions</span> — 1 Star</div>
    <div class="ms-star-row ${stars>=2?'earned':''}">⭐⭐ <span>14 missions</span> — 2 Stars → 🔓 Next Chapter!</div>
    <div class="ms-star-row ${stars>=3?'earned':''}">⭐⭐⭐ <span>20 missions</span> — 3 Stars (Master!)</div>
  `;
  list.appendChild(infoSection);
}

// === MISSION COMPLETE CELEBRATION ===

function _soundMissionComplete() {
  // Exciting victory fanfare using Web Audio
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    const play = (freq, start, dur, type='sine', gain=0.4) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(gain, start+0.01);
      g.gain.exponentialRampToValueAtTime(0.001, start+dur);
      o.connect(g).connect(master);
      o.start(start); o.stop(start+dur+0.05);
    };

    const now = ctx.currentTime;
    // Rising victory arpeggio
    [[523,0],[659,0.08],[784,0.16],[1047,0.24],[784,0.36],[1047,0.44],[1319,0.52]]
      .forEach(([f,t]) => play(f, now+t, 0.18, 'triangle', 0.35));
    // Bass hits
    [[130,0],[196,0.24],[130,0.52]].forEach(([f,t]) => play(f, now+t, 0.2, 'sine', 0.3));
    // Sparkle
    [[2093,0.3],[2637,0.38],[3136,0.46]].forEach(([f,t]) => play(f, now+t, 0.12, 'sine', 0.15));
    // Final chord
    [523,659,784,1047].forEach((f,i) => play(f, now+0.6+i*0.02, 0.4, 'triangle', 0.2));

    setTimeout(() => { try { ctx.close(); } catch(e){} }, 2000);
  } catch(e) {}
}

function _launchFireworks() {
  let canvas = document.getElementById('mission-fireworks-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'mission-fireworks-canvas';
    document.body.appendChild(canvas);
  }
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.add('show');

  const ctx = canvas.getContext('2d');
  const particles = [];
  const COLORS = ['#FFD700','#4CAF50','#FF6B35','#E040FB','#00E5FF','#FF1744','#FFEB3B','#69F0AE'];

  // Launch 6 rockets
  for (let r = 0; r < 6; r++) {
    const x = canvas.width * (0.15 + Math.random() * 0.7);
    const y = canvas.height * (0.2 + Math.random() * 0.4);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const count = 50 + Math.floor(Math.random() * 40);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.012 + Math.random() * 0.012,
        r: 2 + Math.random() * 3,
        color,
        delay: r * 0.12,
        age: 0,
      });
    }
    // Star trails
    for (let i = 0; i < 8; i++) {
      const angle = (i/8)*Math.PI*2;
      particles.push({
        x, y, vx: Math.cos(angle)*7, vy: Math.sin(angle)*7,
        life:1, decay:0.02, r:4, color:'#FFFFFF',
        delay: r*0.12, age:0, isStar:true,
      });
    }
  }

  let start = null;
  function frame(ts) {
    if (!start) start = ts;
    const elapsed = (ts - start) / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = false;
    for (const p of particles) {
      if (elapsed < p.delay) { alive = true; continue; }
      p.age += 0.016;
      p.x += p.vx * 0.9;
      p.y += p.vy * 0.9;
      p.vy += 0.08;
      p.vx *= 0.97;
      p.life = Math.max(0, p.life - p.decay);
      if (p.life <= 0) continue;
      alive = true;
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.isStar ? 12 : 6;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    if (alive && elapsed < 4) requestAnimationFrame(frame);
    else {
      canvas.classList.remove('show');
      ctx.clearRect(0,0,canvas.width,canvas.height);
    }
  }
  requestAnimationFrame(frame);
}

export function showMissionCompleteToast(mission) {
  // 1. Sound
  _soundMissionComplete();

  // 2. Screen flash
  const flash = document.createElement('div');
  flash.className = 'mission-star-flash';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 700);

  // 3. Fireworks
  _launchFireworks();

  // 4. Side notification (game continues uninterrupted)
  let notif = document.getElementById('mission-notif');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'mission-notif';
    notif.className = 'mission-notif';
    document.body.appendChild(notif);
  }
  notif.innerHTML = `
    <div class="mn-header">
      <span class="mn-badge">✅ Mission Complete!</span>
      <span class="mn-num">${mission.missionNum}/20</span>
    </div>
    <div class="mn-title">${mission.icon} ${mission.label}</div>
    <div class="mn-desc">${mission.desc}</div>
    <div class="mn-rewards">
      <span class="mn-reward">✨ +${mission.xpReward} XP</span>
      <span class="mn-reward">🪙 +${mission.coinReward}</span>
    </div>
  `;
  // Slide in
  notif.classList.remove('hide');
  setTimeout(() => notif.classList.add('show'), 50);
  // Slide out after 4s
  setTimeout(() => {
    notif.classList.remove('show');
    notif.classList.add('hide');
  }, 4500);
}

export function refreshMissionSelectXP() { _refreshXP(); }

// ---------------------------------------------------------------------------
// MISSION GUIDE POPUP + IN-GAME REMINDER
// ---------------------------------------------------------------------------

const MISSION_TIPS = {
  score: [
    { icon: '🍉', text: 'Merge big fruits for more points — watermelons give huge scores!' },
    { icon: '🔗', text: 'Combo chains multiply your score. Stack merges quickly!' },
  ],
  merge: [
    { icon: '🎯', text: 'Drop fruits near same-type fruits to merge them.' },
    { icon: '⚡', text: 'Use Lightning power to force-merge the biggest fruit!' },
  ],
  combo: [
    { icon: '🔥', text: 'Drop multiple same-type fruits fast — they chain into combos!' },
    { icon: '🧲', text: 'Magnet power pulls fruits together — great for combos!' },
  ],
  drop: [
    { icon: '🎳', text: 'Just keep dropping! Every fruit counts toward your goal.' },
    { icon: '💡', text: 'Small fruits fill gaps — use them to set up big merges.' },
  ],
  dangerMerge: [
    { icon: '⚠️', text: 'Let fruits pile up near the red danger line, then merge them!' },
    { icon: '💪', text: 'Risky but rewarding — danger zone merges earn bonus XP!' },
  ],
  bigMerge: [
    { icon: '🍉', text: 'Keep merging same fruits — small → medium → large → giant!' },
    { icon: '🌈', text: 'Rainbow power makes any fruit match anything — use it wisely!' },
  ],
  coins: [
    { icon: '🪙', text: 'High-tier merges earn more coins per merge.' },
    { icon: '⚡', text: 'Risk merges near danger zone for coin bonuses!' },
  ],
  games: [
    { icon: '🎮', text: 'Just play and have fun — this one completes itself!' },
    { icon: '🌟', text: 'Try to beat your best score while you\'re at it!' },
  ],
  noPower: [
    { icon: '🧘', text: 'Don\'t tap any power buttons — pure skill only!' },
    { icon: '🎯', text: 'Focus on strategic drops and chain reactions.' },
  ],
};

export function showMissionGuide(mission, onStart) {
  const overlay = document.getElementById('mission-guide-overlay');
  if (!overlay) { onStart?.(); return; }

  // Fill content
  const el = id => document.getElementById(id);
  if (el('mg-icon'))  el('mg-icon').textContent  = mission.icon;
  if (el('mg-num'))   el('mg-num').textContent   = mission.missionNum;
  if (el('mg-title')) el('mg-title').textContent = mission.label;
  if (el('mg-goal'))  el('mg-goal').textContent  = mission.desc;
  if (el('mg-xp'))    el('mg-xp').textContent    = `✨ +${mission.xpReward} XP`;
  if (el('mg-coins')) el('mg-coins').textContent = `🪙 +${mission.coinReward}`;

  // Tips
  const tips = MISSION_TIPS[mission.type] || MISSION_TIPS.score;
  const tipsEl = el('mg-tips');
  if (tipsEl) {
    tipsEl.innerHTML = tips.map(t => `
      <div class="mg-tip">
        <span class="mg-tip-icon">${t.icon}</span>
        <span>${t.text}</span>
      </div>
    `).join('');
  }

  overlay.style.display = 'flex';

  // Start button
  const startBtn = el('mg-start-btn');
  if (startBtn) {
    startBtn.onclick = () => {
      overlay.style.display = 'none';
      onStart?.();
    };
  }
}

export function hideGuide() {
  const overlay = document.getElementById('mission-guide-overlay');
  if (overlay) overlay.style.display = 'none';
}

// Update in-game mission reminder bar
export function updateIngameMissionBar(mission, progress) {
  const bar = document.getElementById('ingame-mission-bar');
  if (!bar) return;

  if (!mission) { bar.style.display = 'none'; return; }

  bar.style.display = 'flex';
  const pct = Math.min(100, Math.round((progress / mission.target) * 100));
  const done = pct >= 100;

  const el = id => document.getElementById(id);
  if (el('imb-icon'))  el('imb-icon').textContent  = mission.icon;
  if (el('imb-label')) el('imb-label').textContent = done
    ? `✅ ${mission.label} — Complete!`
    : mission.desc;
  if (el('imb-prog-fill')) el('imb-prog-fill').style.width = `${pct}%`;
  if (el('imb-pct'))  el('imb-pct').textContent  = done ? '✅' : `${pct}%`;

  bar.classList.toggle('completed', done);
}
