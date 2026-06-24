import { CONFIG } from './config.js';
import { randomDroppableTier } from './items.js';
import { initLifeEnergy, generateEnergy, tickOrchard, onOrchardDeath, getLifeEnergy, getOrchardHealth } from './lifeEnergy.js';
import { initBlight, tickBlight, blightOnGoodMerge, blightOnDrop, getBlightLevel, onBlightFail } from './blightSystem.js';
import { PhysicsWorld } from './physics.js';
import { ParticleSystem } from './particles.js';
import { ScreenShake } from './screenshake.js';
import { UI } from './ui.js';
import { InputController } from './input.js';
import {
  playDropSound, playMergeSound, playGameOverSound, preloadAudio, startMusic,
  playLandSound, playLevelUpSound, playComboSound, playUnlockSound, playHeartbeatSound,
} from './audio.js';
import { drawFruit } from './fruitRenderer.js';
import { recordScore } from './leaderboard.js';
import { addXP, onXPChange, getLevelInfo } from './xp.js';
import { THEMES, isThemeUnlocked } from './themes.js';
import { FloatingTextSystem } from './floatingText.js';
import { clamp, lerp, squishPopScale, landingSquashScale } from './utils.js';
import { addCoins, coinsForMerge } from './coins.js';
import { getStreakMultiplier } from './streak.js';
import { recordMerge, recordDrop, recordCombo, recordGameOver, recordCoinsEarned, recordXPEarned } from './statistics.js';
import { unlockAchievement, onAchievementUnlocked } from './achievements.js';
import { reportMissionProgress } from './dailyMissions.js';
import { reportWeeklyProgress } from './weeklyMissions.js';
import { WeatherSystem } from './weather.js';
import { usePower, reportPowerWasted, getPowerEnergyCost, POWER_DEFS } from './powers.js';
import { checkAndStartBossForCurrentLevel, hitBoss, isBossActive, onBossEvent, getActiveBoss } from './bossManager.js';
import { checkNewlyUnlockedSkills, getSkillModifiers } from './skillTree.js';

const BIG_MERGE_CALLOUTS = ['LIFE ENERGY!', 'BLOOM!', 'THE ORCHARD LIVES!', 'RESTORED!', 'MAGIC FLOWS!', 'THE BLIGHT RETREATS!'];
const RISK_CALLOUTS = ['KEEPER\'S COURAGE!', 'DANGER ZONE!', 'BOLD MOVE!'];

export class Game {
  constructor(canvas, theme, weatherOverride = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.particles = new ParticleSystem();
    this.floatingText = new FloatingTextSystem();
    this.shake = new ScreenShake();
    this.weather = new WeatherSystem();
    this.ui = new UI({
      onRestart: () => this.restart(),
      onUsePower: (id) => this._activatePower(id),
    });
    this.input = new InputController(canvas, {
      onAimToX: (x) => this.setDropperX(x),
      onDrop: () => this.tryDrop(),
      onFirstInteraction: () => {
        preloadAudio();
        startMusic();
      },
    });

    this.popTweens = new Map();
    this.landingSquashes = new Map();
    this.consumedThisStep = new Set();
    this.paused = false;

    this.comboCount = 0;
    this.lastMergeTime = 0;
    this.lastHeartbeatTime = 0;

    // Per-run session stats
    this._sessionMerges = 0;
    this._sessionDrops = 0;
    this._sessionBestCombo = 0;
    this._sessionDangerMerges = 0;
    this._sessionXPEarned = 0;
    this._sessionCoinsEarned = 0;

    // Active power states
    this._freezeUntil = 0;
    this._magnetUntil = 0;
    this._rainbowNextDrop = false;

    this._buildPhysicsForTheme(theme, weatherOverride);
    this._resetState();

    // Phoenix fruit (skill tree) — one use per game
    this._phoenixAvailable = getSkillModifiers().hasPhoenix;

    onXPChange(({ before, after }) => this._checkNewUnlocks(before.totalXP, after.totalXP));

    onBossEvent((evt) => {
      const cx = (this.physics.playLeft + this.physics.playRight) / 2;
      if (evt.type === 'start') {
        this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.15, `✨ ${evt.boss.name.toUpperCase()} STIRS!`, '#A8E6CF');
        setTimeout(() => {
          this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.28, `Merge ${evt.boss.hpRequired}x to awaken!`, '#FFD700');
        }, 800);
        this.shake.trigger(12, 400);
      } else if (evt.type === 'defeated') {
        this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.2, evt.boss.callout, '#FFD700');
        this.shake.trigger(16, 500);
      }
    });

    onAchievementUnlocked((ach) => {
      const cx = (this.physics.playLeft + this.physics.playRight) / 2;
      this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.25, `${ach.emoji} ${ach.name.toUpperCase()}!`, '#FFC857');
      this.shake.trigger(6, 240);
    });

    // Init Life Energy & Blight systems
    initLifeEnergy();
    initBlight(false, 1); // Blight starts inactive; chapter 2+ activates it

    onOrchardDeath(() => {
      if (this.state === 'playing') {
        this._orchardDeathMessage = '🌑 The Orchard\'s heart has gone dark...';
        this._triggerGameOver('orchard');
      }
    });

    onBlightFail(() => {
      if (this.state === 'playing') {
        this._orchardDeathMessage = '🌑 The orchard has fallen.\nThe Blight has won.';
        this._triggerGameOver('blight');
      }
    });

    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  _checkNewUnlocks(beforeXP, afterXP) {
    const cx = (this.physics.playLeft + this.physics.playRight) / 2;

    for (const theme of THEMES) {
      const wasLocked = !isThemeUnlocked(theme, beforeXP);
      const nowUnlocked = isThemeUnlocked(theme, afterXP);
      if (wasLocked && nowUnlocked) {
        playUnlockSound();
        this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.3, `🔓 ${theme.name.toUpperCase()} UNLOCKED!`, '#FFC857');
        this.shake.trigger(7, 280);
      }
    }

    // Achievement: level checks
    const beforeInfo = this._computeLevelFromXP(beforeXP);
    const newInfo = getLevelInfo();
    const newLevel = newInfo.level;
    if (newLevel >= 5)  unlockAchievement('level_5');
    if (newLevel >= 10) unlockAchievement('level_10');
    if (newLevel >= 25) unlockAchievement('level_25');

    // Orchard zone announcements on key level thresholds
    if (newLevel > beforeInfo.level) {
      const zoneMessages = {
        5:  ['🍎 The Apple Grove stirs with life!', '#8BC34A'],
        10: ['🍒 Cherry Valley blooms again!', '#D7263D'],
        15: ['🌕 The Golden Orchard shines!', '#FFD700'],
        20: ['💎 The Crystal Forest awakens!', '#B39DDB'],
        25: ['☁️ The Sky Orchard rises!', '#4DD0E1'],
        30: ['🌳 The Eternal Orchard calls!', '#A8E6CF'],
      };
      const zone = zoneMessages[newLevel];
      if (zone) {
        setTimeout(() => {
          this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.22, zone[0], zone[1]);
          this.shake.trigger(10, 320);
        }, 1200);
      }
    }

    // Skill tree: notify newly unlocked skills
    const newSkills = checkNewlyUnlockedSkills(beforeInfo.level, newLevel);
    for (const skill of newSkills) {
      setTimeout(() => {
        this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.18, `${skill.emoji} ${skill.name.toUpperCase()} UNLOCKED!`, '#A8E6CF');
        playUnlockSound();
        this.shake.trigger(8, 300);
      }, 600);
    }

    // Guardian check: at every 10th level start a guardian encounter
    if (newLevel > beforeInfo.level && newLevel % 10 === 0) {
      setTimeout(() => checkAndStartBossForCurrentLevel(), 1500);
    }
  }

  // Fast level compute without importing computeLevelInfo (avoids circular deps)
  _computeLevelFromXP(xp) {
    let level = 1, remaining = xp, need = 100;
    while (remaining >= need) { remaining -= need; level++; need = Math.round(need * 1.15); }
    return { level };
  }

  _buildPhysicsForTheme(theme, weatherOverride = null) {
    this.theme = theme;
    this._weatherOverride = weatherOverride;
    this.physics = new PhysicsWorld(theme.modifiers.boxWidthScale);
    this.physics.onCollisionStart((pairs) => this.handleCollisions(pairs));

    // Player preference wins; null means use the theme's own weather setting.
    this.weather.setWeather(weatherOverride ?? theme.weather ?? 'none');
  }

  get tiers() { return this.theme.tiers; }
  get maxTierIndex() { return this.theme.tiers.length - 1; }
  get droppableIndices() {
    const count = Math.min(this.theme.droppableCount, this.theme.tiers.length);
    return Array.from({ length: count }, (_, i) => i);
  }

  _resetState() {
    this.score = 0;
    this.state = 'playing';
    this.dangerTimer = 0;
    this.dropperX = (this.physics.playLeft + this.physics.playRight) / 2;
    this.nextDropAllowedAt = 0;
    this.comboCount = 0;
    this.lastMergeTime = 0;
    this.lastHeartbeatTime = 0;
    this.comboMeterFill = 0;
    this._trailBody = null;
    this.currentPeakY = CONFIG.BOX_HEIGHT; // lowest Y seen this game (smallest = highest stack)
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY_PEAK_Y);
      this.bestPeakY = raw !== null ? parseFloat(raw) : null;
    } catch (e) { this.bestPeakY = null; }

    this._sessionMerges = 0;
    this._sessionDrops = 0;
    this._sessionBestCombo = 0;
    this._sessionDangerMerges = 0;
    this._sessionXPEarned = 0;
    this._sessionCoinsEarned = 0;
    this._freezeUntil = 0;
    this._magnetUntil = 0;
    this._rainbowNextDrop = false;

    // Reset story systems
    initLifeEnergy();
    this._orchardDeathMessage = null;

    this.currentTier = randomDroppableTier(this.droppableIndices);
    this.nextTier = randomDroppableTier(this.droppableIndices);
    this.ui.setScore(0);
    this.ui.setCoins(0); // session coins start display
    this.ui.setNextPreview(this.tiers[this.nextTier]);
    this.ui.setEvolutionChain(this.tiers, this.currentTier);
    this.ui.setDangerProgress(0);
    this.ui.hideGameOver();
    this.ui.updatePowerButtons();
  }

  restart(theme, weatherOverride = this._weatherOverride) {
    this._buildPhysicsForTheme(theme || this.theme, weatherOverride);
    this.popTweens.clear();
    this.landingSquashes.clear();
    this.paused = false;
    this._resetState();
  }

  pause() { this.paused = true; }

  resume() {
    this.paused = false;
    this.lastFrameTime = performance.now();
  }

  setDropperX(x) {
    if (this.state !== 'playing') return;
    const r = this.tiers[this.currentTier].radius;
    this.dropperX = clamp(x, this.physics.playLeft + r, this.physics.playRight - r);
  }

  tryDrop() {
    if (this.state !== 'playing' || this.paused) return;
    preloadAudio();
    startMusic();
    const now = performance.now();
    if (now < this.nextDropAllowedAt) return;
    const cooldown = CONFIG.DROP_COOLDOWN_MS * this.theme.modifiers.dropCooldownScale;
    this.nextDropAllowedAt = now + cooldown;

    const tier = this.currentTier;
    const radius = this.tiers[tier].radius;
    const x = clamp(this.dropperX, this.physics.playLeft + radius, this.physics.playRight - radius);
    const body = this.physics.addItem(x, CONFIG.DROPPER_Y, tier, radius);
    this.popTweens.set(body.itemId, now);
    this._trailBody = body;

    if (this._rainbowNextDrop) {
      body.isRainbow = true;
      this._rainbowNextDrop = false;
    }

    playDropSound();
    this.shake.trigger(CONFIG.SCREEN_SHAKE_DROP, 120);
    blightOnDrop(); // reset idle blight timer

    this._sessionDrops++;
    recordDrop();
    reportMissionProgress('drop');
    reportWeeklyProgress('drop');

    this.currentTier = this.nextTier;
    this.nextTier = randomDroppableTier(this.droppableIndices);
    this.ui.setNextPreview(this.tiers[this.nextTier]);
    this.ui.setEvolutionChain(this.tiers, this.currentTier);
  }

  handleCollisions(pairs) {
    for (const pair of pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      this._maybeTriggerLanding(a);
      this._maybeTriggerLanding(b);
      if (a.label !== 'item' || b.label !== 'item') continue;
      if (this.consumedThisStep.has(a.id) || this.consumedThisStep.has(b.id)) continue;

      // Rainbow fruit matches any tier
      const tierMatch = a.tier === b.tier || a.isRainbow || b.isRainbow;
      if (!tierMatch) continue;

      this.consumedThisStep.add(a.id);
      this.consumedThisStep.add(b.id);

      // For rainbow, use the non-rainbow tier (or a if both rainbow)
      const mergeTier = a.isRainbow ? b.tier : a.tier;
      this._resolveMerge(a, b, mergeTier);
    }
  }

  _maybeTriggerLanding(body) {
    if (body.label !== 'item' || body.hasLanded) return;
    const now = performance.now();
    if (now - body.spawnTime < CONFIG.POP_TWEEN_MS) return;
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    if (speed < CONFIG.LANDING_MIN_IMPACT_SPEED) return;
    body.hasLanded = true;
    this.landingSquashes.set(body.itemId, now);
    playLandSound();
  }

  _resolveMerge(a, b, tier) {
    const mx = (a.position.x + b.position.x) / 2;
    const my = (a.position.y + b.position.y) / 2;
    const color = this.tiers[Math.min(tier, this.maxTierIndex)].color;

    // If the trail body is one of the merging pair, release it
    if (this._trailBody === a || this._trailBody === b) this._trailBody = null;

    this.physics.removeBody(a);
    this.physics.removeBody(b);
    this.popTweens.delete(a.itemId);
    this.popTweens.delete(b.itemId);
    this.landingSquashes.delete(a.itemId);
    this.landingSquashes.delete(b.itemId);

    this.particles.spawnBurst(mx, my, color, tier);
    playMergeSound(tier);

    // Combo tracking
    const now = performance.now();
    this.comboCount = now - this.lastMergeTime <= CONFIG.COMBO_WINDOW_MS ? this.comboCount + 1 : 1;
    this.lastMergeTime = now;
    this.comboMeterFill = 1.0; // slam the meter to full on every merge

    // Risk/Reward zone: merges in the upper portion of the jar get 2x
    const isRiskMerge = my < CONFIG.RISK_ZONE_Y;

    const isBigMerge = tier >= CONFIG.SCREEN_SHAKE_BIG_MERGE_TIER;
    const shakeAmount = CONFIG.SCREEN_SHAKE_BASE_MERGE + tier * CONFIG.SCREEN_SHAKE_PER_TIER;
    this.shake.trigger(shakeAmount, 180 + tier * 40);

    let scoreGain;
    if (tier >= this.maxTierIndex) {
      scoreGain = this.tiers[tier].score * 2;
    } else {
      const newTier = tier + 1;
      const newBody = this.physics.addItem(mx, my, newTier, this.tiers[newTier].radius);
      this.popTweens.set(newBody.itemId, now);
      scoreGain = this.tiers[newTier].score;
    }

    // Apply risk bonus
    const riskMult = isRiskMerge ? 2 : 1;
    scoreGain *= riskMult;

    this.score += scoreGain;
    this.ui.reportLiveScore(this.score);

    const coinGain = Math.round(coinsForMerge(scoreGain, isRiskMerge) * getStreakMultiplier());
    addCoins(coinGain);
    this._sessionCoinsEarned += coinGain;
    recordCoinsEarned(coinGain);
    this.ui.addSessionCoins(coinGain);

    // Generate Life Energy from merge
    const energyGain = generateEnergy(tier, this.comboCount);
    blightOnGoodMerge(tier, this.comboCount);

    // Show energy gain on big merges or combos
    if (energyGain >= 12 || this.comboCount >= 3) {
      this.floatingText.spawnCallout(mx, my - 18, `✨ +${energyGain} Life Energy`, '#A8E6CF');
    }

    // Update Orchard meters in UI
    this.ui.setOrchardMeters?.(getLifeEnergy(), getOrchardHealth(), getBlightLevel());

    const xpResult = addXP(scoreGain);
    this._sessionXPEarned += scoreGain;
    recordXPEarned(scoreGain);

    // Track merge stats
    this._sessionMerges++;
    recordMerge();
    reportMissionProgress('merge');
    reportMissionProgress('score', scoreGain);
    reportWeeklyProgress('merge');
    reportWeeklyProgress('score', scoreGain);

    // Boss hit — every merge during a boss fight damages the boss
    if (isBossActive()) {
      const bossResult = hitBoss();
      if (bossResult?.defeated) {
        addXP(bossResult.boss.reward.xp);
        addCoins(bossResult.boss.reward.coins);
        this.floatingText.spawnCallout(mx, my - 60, `💰 +${bossResult.boss.reward.coins} 🪙  +${bossResult.boss.reward.xp} 🌿`, '#FFD700');
      } else if (bossResult) {
        this.floatingText.spawnCallout(mx, my - 40, `✨ Guardian: ${bossResult.remainingHP} merges left!`, '#A8E6CF');
      }
    }

    if (this._sessionMerges === 1) unlockAchievement('first_merge');
    if (this._sessionMerges >= 10) unlockAchievement('merges_10');
    if (this._sessionMerges >= 50) unlockAchievement('merges_50');

    // Danger merges
    if (isRiskMerge) {
      this._sessionDangerMerges++;
      unlockAchievement('risk_merge');
      if (this._sessionDangerMerges >= 10) unlockAchievement('risk_10');
    }

    // Score achievements
    if (this.score >= 500)   unlockAchievement('score_500');
    if (this.score >= 1000)  unlockAchievement('score_1000');
    if (this.score >= 2500)  unlockAchievement('score_2500');
    if (this.score >= 5000)  unlockAchievement('score_5000');
    if (this.score >= 10000) unlockAchievement('score_10000');
    if (this.score >= 20000) unlockAchievement('score_20000');

    // Combo tracking
    if (this.comboCount > this._sessionBestCombo) {
      this._sessionBestCombo = this.comboCount;
      recordCombo(this.comboCount);
    }
    reportMissionProgress('dangerMerge', isRiskMerge ? 1 : 0);
    if (isRiskMerge) reportWeeklyProgress('dangerMerge', 1);

    // --- Floating text ---
    this.floatingText.spawnScore(mx, my, scoreGain, color);
    if (isRiskMerge) {
      const rc = RISK_CALLOUTS[Math.floor(Math.random() * RISK_CALLOUTS.length)];
      this.floatingText.spawnCallout(mx, my - 20, `⚡ ${rc}`, '#FF6B35');
    }
    if (isBigMerge && !isRiskMerge) {
      const callout = BIG_MERGE_CALLOUTS[Math.floor(Math.random() * BIG_MERGE_CALLOUTS.length)];
      this.floatingText.spawnCallout(mx, my, callout, '#fff');
    }
    if (this.comboCount >= 2) {
      this.floatingText.spawnCombo(mx, my, this.comboCount);
      playComboSound(this.comboCount);

      if (this.comboCount >= 3) reportMissionProgress('combo', 1);
      if (this.comboCount >= 3) reportWeeklyProgress('combo', 1);
      if (this.comboCount >= 3)  unlockAchievement('combo_3');
      if (this.comboCount >= 5)  unlockAchievement('combo_5');
      if (this.comboCount >= 10) unlockAchievement('combo_10');

      if (this.comboCount >= CONFIG.COMBO_LEGENDARY_THRESHOLD) {
        this.floatingText.spawnCallout(mx, my - 44, '🌳 LEGENDARY KEEPER!', '#A8E6CF');
        this.shake.trigger(12, 350);
        reportWeeklyProgress('legendary', 1);
      }
    }
    if (xpResult.leveledUp) {
      this.floatingText.spawnCallout(mx, my - 26, '🌱 KEEPER GROWS STRONGER!', '#A8E6CF');
      playLevelUpSound();
      this.shake.trigger(9, 260);
    }
  }

  // --- POWER SYSTEM --------------------------------------------------------

  _activatePower(id) {
    if (this.state !== 'playing' || this.paused) return;

    const energyCost = getPowerEnergyCost(id);
    const cx = (this.physics.playLeft + this.physics.playRight) / 2;

    if (!usePower(id)) {
      // Not enough Life Energy
      if (energyCost > 0) {
        this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.35, `⚡ Need ${energyCost} Life Energy!`, '#FF6B6B');
      }
      return;
    }

    // Update meters immediately after spending
    this.ui.setOrchardMeters?.(getLifeEnergy(), getOrchardHealth(), getBlightLevel());
    unlockAchievement('use_power');

    const now = performance.now();

    if (id === 'bomb') {
      // Remove the 4 highest fruits (lowest Y value = highest in jar)
      const bodies = [...this.physics.getItemBodies()].sort((a, b) => a.position.y - b.position.y);
      const toRemove = bodies.slice(0, Math.min(4, bodies.length));
      for (const b of toRemove) {
        this.particles.spawnBurst(b.position.x, b.position.y, '#FF4500', 3);
        this.physics.removeBody(b);
        this.popTweens.delete(b.itemId);
        this.landingSquashes.delete(b.itemId);
      }
      this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.4, '💣 BOMB!', '#FF4500');
      this.shake.trigger(14, 400);
    }

    else if (id === 'freeze') {
      this._freezeUntil = now + CONFIG.FREEZE_DURATION_MS;
      this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.4, '❄️ FREEZE!', '#00E5FF');
    }

    else if (id === 'magnet') {
      this._magnetUntil = now + CONFIG.MAGNET_DURATION_MS;
      this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.4, '🧲 MAGNET!', '#7C4DFF');
    }

    else if (id === 'lightning') {
      // Find a random pair of same-tier fruits and force-merge them
      const bodies = [...this.physics.getItemBodies()];
      const byTier = new Map();
      for (const b of bodies) {
        if (!byTier.has(b.tier)) byTier.set(b.tier, []);
        byTier.get(b.tier).push(b);
      }
      let merged = false;
      for (const [, group] of byTier) {
        if (group.length >= 2) {
          const a = group[0];
          const b = group[1];
          if (!this.consumedThisStep.has(a.id) && !this.consumedThisStep.has(b.id)) {
            this.consumedThisStep.add(a.id);
            this.consumedThisStep.add(b.id);
            this._resolveMerge(a, b, a.tier);
            merged = true;
          }
          break;
        }
      }
      if (merged) {
        this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.4, '⚡ LIGHTNING!', '#FFD600');
        this.shake.trigger(10, 300);
      } else {
        reportPowerWasted(); // Wasted power = more Blight
        this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.4, '⚡ No match found! Blight grows...', '#FF4444');
      }
    }

    else if (id === 'rainbow') {
      this._rainbowNextDrop = true;
      this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.4, '🌈 RAINBOW!', '#FF80AB');
    }

    this.ui.updatePowerButtons();
  }

  _applyMagnet() {
    const bodies = [...this.physics.getItemBodies()];
    const byTier = new Map();
    for (const b of bodies) {
      if (!byTier.has(b.tier)) byTier.set(b.tier, []);
      byTier.get(b.tier).push(b);
    }
    for (const [, group] of byTier) {
      if (group.length < 2) continue;
      const cx = group.reduce((s, b) => s + b.position.x, 0) / group.length;
      const cy = group.reduce((s, b) => s + b.position.y, 0) / group.length;
      for (const b of group) {
        const dx = cx - b.position.x;
        const dy = cy - b.position.y;
        const dist = Math.hypot(dx, dy) || 1;
        const force = 0.0006;
        const Matter = window.Matter;
        if (Matter) {
          Matter.Body.applyForce(b, b.position, { x: dx / dist * force, y: dy / dist * force });
        }
      }
    }
  }

  _updateDangerTimer(dtMs) {
    const now = performance.now();
    let dangerous = false;

    for (const body of this.physics.getItemBodies()) {
      const age = now - body.spawnTime;
      if (age < CONFIG.DANGER_GRACE_MS) continue;
      const verticalSpeed = Math.abs(body.velocity.y);
      const topEdge = body.position.y - body.circleRadius;
      if (topEdge < CONFIG.DANGER_LINE_Y && verticalSpeed < CONFIG.DANGER_SETTLE_SPEED) {
        dangerous = true;
        break;
      }
    }

    this.dangerTimer = dangerous ? this.dangerTimer + dtMs : 0;
    const progress = clamp(this.dangerTimer / CONFIG.DANGER_TIME_LIMIT_MS, 0, 1);
    this.ui.setDangerProgress(progress);

    if (dangerous) {
      const interval = lerp(CONFIG.HEARTBEAT_INTERVAL_MAX_MS, CONFIG.HEARTBEAT_INTERVAL_MIN_MS, progress);
      if (now - this.lastHeartbeatTime >= interval) {
        this.lastHeartbeatTime = now;
        playHeartbeatSound(progress);
      }
    } else {
      this.lastHeartbeatTime = 0;
    }

    if (this.dangerTimer >= CONFIG.DANGER_TIME_LIMIT_MS) {
      this._triggerGameOver();
    }
  }

  _triggerGameOver(reason = 'overflow') {
    // Phoenix Fruit: if unlocked and available, save the player once
    if (this._phoenixAvailable && reason === 'overflow') {
      this._phoenixAvailable = false;
      const cx = (this.physics.playLeft + this.physics.playRight) / 2;
      this.floatingText.spawnCallout(cx, CONFIG.BOX_HEIGHT * 0.3, '🔥 THE PHOENIX GUARDIAN SAVES YOU!', '#FF6B35');
      this.shake.trigger(15, 500);
      this.dangerTimer = 0;
      // Remove the top 3 fruits to give breathing room
      const bodies = [...this.physics.getItemBodies()].sort((a, b) => a.position.y - b.position.y);
      bodies.slice(0, 3).forEach((b) => {
        this.particles.spawnBurst(b.position.x, b.position.y, '#FF6B35', 3);
        this.physics.removeBody(b);
        this.popTweens.delete(b.itemId);
        this.landingSquashes.delete(b.itemId);
      });
      return; // Don't actually game over
    }

    this.state = 'gameover';
    playGameOverSound();
    this.shake.trigger(11, 320);

    // Persist the highest stack if it beats the all-time record
    if (this.currentPeakY < CONFIG.BOX_HEIGHT &&
        (this.bestPeakY === null || this.currentPeakY < this.bestPeakY)) {
      try { localStorage.setItem(CONFIG.STORAGE_KEY_PEAK_Y, String(this.currentPeakY)); } catch (e) {}
      this.bestPeakY = this.currentPeakY;
    }

    recordScore(this.score);
    recordGameOver(this.score);
    reportMissionProgress('games');
    reportWeeklyProgress('games');

    this.ui.showGameOver(this.score, {
      sessionMerges: this._sessionMerges,
      sessionBestCombo: this._sessionBestCombo,
      sessionCoins: this._sessionCoinsEarned,
      sessionXP: this._sessionXPEarned,
      sessionDangerMerges: this._sessionDangerMerges,
      deathMessage: this._orchardDeathMessage || '🍂 The orchard could not hold...',
    });
  }

  _loop(now) {
    const dtMs = Math.min(now - this.lastFrameTime, 33);
    this.lastFrameTime = now;
    this.consumedThisStep.clear();

    const frozen = now < this._freezeUntil;

    if (this.state === 'playing' && !this.paused && !frozen) {
      const moveAmount = (CONFIG.DROPPER_MOVE_SPEED * dtMs) / 1000;
      if (this.input.holdLeft)  this.setDropperX(this.dropperX - moveAmount);
      if (this.input.holdRight) this.setDropperX(this.dropperX + moveAmount);

      this.physics.step(dtMs);
      this.physics.applyWind(this.theme.modifiers.windStrength, dtMs);
      this._updateDangerTimer(dtMs);
      this.ui.setScore(this.score);

      // Tick Orchard systems
      tickOrchard(dtMs);
      tickBlight(dtMs);
      // Update HUD meters periodically (every ~10 frames is fine)
      if (Math.floor(now / 100) !== Math.floor((now - dtMs) / 100)) {
        this.ui.setOrchardMeters?.(getLifeEnergy(), getOrchardHealth(), getBlightLevel());
      }

      // Decay combo meter toward 0 over the combo window duration
      if (this.comboMeterFill > 0) {
        this.comboMeterFill = Math.max(0, this.comboMeterFill - dtMs / CONFIG.COMBO_WINDOW_MS);
      }

      // Drop trail: emit sparkles from the falling body while it moves fast enough
      if (this._trailBody) {
        const vel = this._trailBody.velocity;
        const speed = Math.hypot(vel.x, vel.y);
        if (speed > 1.8) {
          const tr = this._trailBody;
          const color = this.tiers[tr.tier]?.color ?? '#fff';
          // Emit from the top edge of the ball so sparks drift upward like a wake
          this.particles.spawnTrail(tr.position.x, tr.position.y - tr.circleRadius * 0.6, color);
        } else {
          this._trailBody = null; // settled
        }
      }

      // Track the highest point the stack has ever reached this game
      for (const b of this.physics.getItemBodies()) {
        if (b.position.y - b.circleRadius < this.currentPeakY) {
          this.currentPeakY = b.position.y - b.circleRadius;
        }
      }
    } else if (this.state === 'playing' && frozen) {
      // Frozen: step physics minimally so the game doesn't break, but no wind
    }

    if (this.state === 'playing' && !this.paused) {
      if (now < this._magnetUntil) this._applyMagnet();
    }

    if (!this.paused) {
      this.particles.update(dtMs);
      this.floatingText.update(dtMs);
      this.shake.update(dtMs);
      this.weather.update(dtMs, CONFIG.BOX_WIDTH, CONFIG.BOX_HEIGHT);
    }

    this._render(now);
    requestAnimationFrame((t) => this._loop(t));
  }

  _render(now) {
    const ctx = this.ctx;
    const { x: shakeX, y: shakeY } = this.shake.offset;

    ctx.clearRect(0, 0, CONFIG.BOX_WIDTH, CONFIG.BOX_HEIGHT);
    ctx.save();
    ctx.translate(shakeX, shakeY);

    this._drawJar(ctx);
    this._drawDangerPulse(ctx, now);
    this._drawRiskZone(ctx);
    this._drawGhostLine(ctx);
    this._drawItems(ctx, now);
    this._drawDropperGuide(ctx);
    this.particles.draw(ctx);
    this.weather.draw(ctx, CONFIG.BOX_WIDTH, CONFIG.BOX_HEIGHT);
    this.floatingText.draw(ctx);
    this._drawComboMeter(ctx, now);

    // Freeze overlay
    if (now < this._freezeUntil) {
      ctx.fillStyle = 'rgba(0, 200, 255, 0.08)';
      ctx.fillRect(0, 0, CONFIG.BOX_WIDTH, CONFIG.BOX_HEIGHT);
    }

    ctx.restore();
  }

  _drawRiskZone(ctx) {
    // Subtle glowing line showing the 2x bonus zone
    ctx.save();
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = 'rgba(255, 107, 53, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.physics.playLeft, CONFIG.RISK_ZONE_Y);
    ctx.lineTo(this.physics.playRight, CONFIG.RISK_ZONE_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  _drawDangerPulse(ctx, now) {
    const dangerProgress = clamp(this.dangerTimer / CONFIG.DANGER_TIME_LIMIT_MS, 0, 1);
    if (dangerProgress <= 0) return;

    const left  = this.physics.playLeft;
    const right = this.physics.playRight;

    // Pulse frequency mirrors the heartbeat: faster as danger increases
    const interval = lerp(CONFIG.HEARTBEAT_INTERVAL_MAX_MS, CONFIG.HEARTBEAT_INTERVAL_MIN_MS, dangerProgress);
    const pulse = 0.5 + 0.5 * Math.sin((now / interval) * Math.PI * 2);
    const intensity = dangerProgress * pulse;

    ctx.save();

    // ── Dropper-zone tint: top of play area down to danger line ──────────
    const topTintGrad = ctx.createLinearGradient(0, 0, 0, CONFIG.DANGER_LINE_Y);
    topTintGrad.addColorStop(0,   `rgba(220,30,30,${(intensity * 0.18).toFixed(3)})`);
    topTintGrad.addColorStop(1,   'rgba(220,30,30,0)');
    ctx.fillStyle = topTintGrad;
    ctx.fillRect(left, 0, right - left, CONFIG.DANGER_LINE_Y);

    // ── Left-wall inner glow ──────────────────────────────────────────────
    const glowW = 24 + dangerProgress * 10;
    const leftGlow = ctx.createLinearGradient(left, 0, left + glowW, 0);
    leftGlow.addColorStop(0,   `rgba(255,30,30,${(intensity * 0.55).toFixed(3)})`);
    leftGlow.addColorStop(1,   'rgba(255,30,30,0)');
    ctx.fillStyle = leftGlow;
    ctx.fillRect(left, 0, glowW, CONFIG.BOX_HEIGHT);

    // ── Right-wall inner glow ─────────────────────────────────────────────
    const rightGlow = ctx.createLinearGradient(right, 0, right - glowW, 0);
    rightGlow.addColorStop(0,   `rgba(255,30,30,${(intensity * 0.55).toFixed(3)})`);
    rightGlow.addColorStop(1,   'rgba(255,30,30,0)');
    ctx.fillStyle = rightGlow;
    ctx.fillRect(right - glowW, 0, glowW, CONFIG.BOX_HEIGHT);

    // ── Danger line itself: glowing red stroke ────────────────────────────
    const lineAlpha = 0.25 + intensity * 0.55;
    ctx.beginPath();
    ctx.moveTo(left, CONFIG.DANGER_LINE_Y);
    ctx.lineTo(right, CONFIG.DANGER_LINE_Y);
    ctx.lineWidth = 1.5 + dangerProgress * 1.5;
    ctx.strokeStyle = `rgba(255,50,50,${lineAlpha.toFixed(3)})`;
    ctx.shadowBlur  = 6 + dangerProgress * 12;
    ctx.shadowColor = 'rgba(255,30,30,0.9)';
    ctx.stroke();
    ctx.shadowBlur  = 0;

    ctx.restore();
  }

  _drawGhostLine(ctx) {
    if (this.bestPeakY === null) return;

    const left  = this.physics.playLeft;
    const right = this.physics.playRight;
    const y     = this.bestPeakY;

    // Don't draw if the ghost is above the danger line or off-screen
    if (y < CONFIG.DANGER_LINE_Y || y > CONFIG.BOX_HEIGHT - CONFIG.WALL_THICKNESS) return;

    ctx.save();

    // Dashed line spanning the play width
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Small "BEST" label anchored to the right wall
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillText('BEST', right - 4, y - 3);

    // If the current game stack has beaten the ghost, give it a gold tint
    if (this.currentPeakY < this.bestPeakY) {
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.45)';
      ctx.beginPath();
      ctx.moveTo(left, this.currentPeakY);
      ctx.lineTo(right, this.currentPeakY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255, 209, 102, 0.55)';
      ctx.fillText('NEW!', right - 4, this.currentPeakY - 3);
    }

    ctx.restore();
  }

  _drawComboMeter(ctx, now) {
    if (this.comboMeterFill <= 0.005) return;

    const left   = this.physics.playLeft;
    const right  = this.physics.playRight;
    const barW   = right - left - 16;
    const barH   = 5;
    const barX   = left + 8;
    const barY   = CONFIG.BOX_HEIGHT - CONFIG.WALL_THICKNESS - barH - 6;
    const fillW  = barW * this.comboMeterFill;
    const count  = this.comboCount;

    // Choose a hue based on combo depth
    let fillColor;
    if (count >= CONFIG.COMBO_LEGENDARY_THRESHOLD) {
      // Legendary: cycling magenta pulse
      const pulse = 0.65 + 0.35 * Math.sin(now * 0.012);
      fillColor = `rgba(255, 30, 180, ${pulse})`;
    } else if (count >= 5) {
      fillColor = '#FF4422';
    } else if (count >= 3) {
      fillColor = '#FF8C42';
    } else {
      fillColor = '#FFD166';
    }

    const alpha = Math.min(1, this.comboMeterFill * 3); // quick fade-in, slow fade-out
    ctx.save();
    ctx.globalAlpha = alpha;

    // Track (background)
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, barH / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fill();

    // Filled portion
    if (fillW > barH) {
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, barH / 2);
      ctx.fillStyle = fillColor;
      ctx.fill();

      // Glow on higher combos
      if (count >= 3) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = fillColor;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Combo count label — shown at 2+ combos
    if (count >= 2) {
      const labelX = barX + fillW - 2;
      const labelY = barY - 5;
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.fillText(`×${count}`, Math.min(labelX, barX + barW), labelY);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  _drawJar(ctx) {
    const left = this.physics.playLeft;
    const right = this.physics.playRight;
    const width = right - left;

    if (left > 0.5) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(0, 0, left, CONFIG.BOX_HEIGHT);
      ctx.fillRect(right, 0, CONFIG.BOX_WIDTH - right, CONFIG.BOX_HEIGHT);
    }

    const bgGrad = ctx.createLinearGradient(0, 0, 0, CONFIG.BOX_HEIGHT);
    bgGrad.addColorStop(0, 'rgba(255,255,255,0.05)');
    bgGrad.addColorStop(1, 'rgba(255,255,255,0.015)');
    ctx.fillStyle = bgGrad;
    roundRectPath(ctx, left + 2, 2, width - 4, CONFIG.BOX_HEIGHT - 4, 18);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(left + 16, 4);
    ctx.lineTo(right - 16, 4);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();
  }

  _drawItems(ctx, now) {
    for (const body of this.physics.getItemBodies()) {
      const tier = this.tiers[body.tier];
      let scaleX = 1;
      let scaleY = 1;

      const spawnedAt = this.popTweens.get(body.itemId);
      if (spawnedAt !== undefined) {
        const t = (now - spawnedAt) / CONFIG.POP_TWEEN_MS;
        if (t >= 1) {
          this.popTweens.delete(body.itemId);
        } else {
          const squish = squishPopScale(t);
          scaleX = squish.scaleX;
          scaleY = squish.scaleY;
        }
      } else {
        const landedAt = this.landingSquashes.get(body.itemId);
        if (landedAt !== undefined) {
          const t = (now - landedAt) / CONFIG.LANDING_SQUASH_MS;
          if (t >= 1) {
            this.landingSquashes.delete(body.itemId);
          } else {
            const squash = landingSquashScale(t);
            scaleX = squash.scaleX;
            scaleY = squash.scaleY;
          }
        }
      }

      // Rainbow fruit gets a rainbow hue effect
      if (body.isRainbow) {
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.scale(scaleX, scaleY);
        const hue = (now / 10) % 360;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 12;
        ctx.translate(-body.position.x, -body.position.y);
        drawFruit(ctx, tier, tier.kind, body.position.x, body.position.y, tier.radius, scaleX, scaleY);
        ctx.restore();
      } else {
        drawFruit(ctx, tier, tier.kind, body.position.x, body.position.y, tier.radius, scaleX, scaleY);
      }
    }
  }

  _drawDropperGuide(ctx) {
    if (this.state !== 'playing') return;
    const tier = this.tiers[this.currentTier];

    ctx.save();
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.dropperX, CONFIG.DROPPER_Y + tier.radius);
    ctx.lineTo(this.dropperX, CONFIG.BOX_HEIGHT);
    ctx.stroke();
    ctx.restore();

    if (this._rainbowNextDrop) {
      // Draw a rainbow-glowing version
      const hue = (performance.now() / 10) % 360;
      ctx.save();
      ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
      ctx.shadowBlur = 14;
      drawFruit(ctx, tier, tier.kind, this.dropperX, CONFIG.DROPPER_Y, tier.radius);
      ctx.restore();
    } else {
      drawFruit(ctx, tier, tier.kind, this.dropperX, CONFIG.DROPPER_Y, tier.radius);
    }
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
