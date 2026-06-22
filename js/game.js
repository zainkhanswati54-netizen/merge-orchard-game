import { CONFIG } from './config.js';
import { randomDroppableTier } from './items.js';
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
import { addXP, onXPChange } from './xp.js';
import { THEMES, isThemeUnlocked } from './themes.js';
import { FloatingTextSystem } from './floatingText.js';
import { clamp, lerp, squishPopScale, landingSquashScale } from './utils.js';

const BIG_MERGE_CALLOUTS = ['SPLASH!', 'JUICY!', 'POW!', 'NICE!'];

export class Game {
  constructor(canvas, theme) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.particles = new ParticleSystem();
    this.floatingText = new FloatingTextSystem();
    this.shake = new ScreenShake();
    this.ui = new UI({ onRestart: () => this.restart() });
    this.input = new InputController(canvas, {
      onAimToX: (x) => this.setDropperX(x),
      onDrop: () => this.tryDrop(),
      onFirstInteraction: () => {
        preloadAudio();
        startMusic();
      },
    });

    this.popTweens = new Map();        // itemId -> spawnTimestamp (merge/drop pop-in)
    this.landingSquashes = new Map();  // itemId -> impactTimestamp (first-hit squash)
    this.consumedThisStep = new Set();
    this.paused = false; // true while the in-game Pause/Settings overlay is open

    this.comboCount = 0;
    this.lastMergeTime = 0;
    this.lastHeartbeatTime = 0; // drives the accelerating danger heartbeat (see _updateDangerTimer)

    this._buildPhysicsForTheme(theme);
    this._resetState();

    // Detect a theme crossing from locked to unlocked the moment it
    // happens (not just at Level Select render time), so an unlock during
    // active play gets an immediate, satisfying callout instead of being
    // silently discovered later.
    onXPChange(({ before, after }) => this._checkNewUnlocks(before.totalXP, after.totalXP));

    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  _checkNewUnlocks(beforeXP, afterXP) {
    for (const theme of THEMES) {
      const wasLocked = !isThemeUnlocked(theme, beforeXP);
      const nowUnlocked = isThemeUnlocked(theme, afterXP);
      if (wasLocked && nowUnlocked) {
        playUnlockSound();
        const x = (this.physics.playLeft + this.physics.playRight) / 2;
        this.floatingText.spawnCallout(x, CONFIG.BOX_HEIGHT * 0.3, `🔓 ${theme.name.toUpperCase()} UNLOCKED!`, '#FFC857');
        this.shake.trigger(7, 280);
      }
    }
  }

  // (Re)builds the physics world to match the active theme's jar width —
  // narrower jars in harder orchards are real walls, not just a visual
  // illusion, so collisions/merges genuinely happen in a tighter space.
  _buildPhysicsForTheme(theme) {
    this.theme = theme;
    this.physics = new PhysicsWorld(theme.modifiers.boxWidthScale);
    this.physics.onCollisionStart((pairs) => this.handleCollisions(pairs));
  }

  get tiers() {
    return this.theme.tiers;
  }

  get maxTierIndex() {
    return this.theme.tiers.length - 1;
  }

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
    this.currentTier = randomDroppableTier(this.droppableIndices);
    this.nextTier = randomDroppableTier(this.droppableIndices);
    this.ui.setScore(0);
    this.ui.setNextPreview(this.tiers[this.nextTier]);
    this.ui.setDangerProgress(0);
    this.ui.hideGameOver();
  }

  // theme is optional — omit it to restart the same orchard (the common
  // "Play Again" case); pass a new theme to switch orchards entirely (the
  // "Change Orchard" flow from the Game Over modal). Always rebuilding
  // physics here (even for a same-theme restart) keeps every run starting
  // from a guaranteed-clean slate — no residual forces or stale walls.
  restart(theme) {
    this._buildPhysicsForTheme(theme || this.theme);
    this.popTweens.clear();
    this.landingSquashes.clear();
    this.paused = false; // restarting from the pause menu must not leave the new run frozen
    this._resetState();
  }

  // Used by the in-game Pause button: freezes physics/timers/score while
  // the pause (or Settings) overlay is open, without losing any state, then
  // picks back up exactly where it left off.
  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.lastFrameTime = performance.now(); // avoid one giant dt jump on resume
  }

  setDropperX(x) {
    if (this.state !== 'playing') return;
    const r = this.tiers[this.currentTier].radius;
    this.dropperX = clamp(x, this.physics.playLeft + r, this.physics.playRight - r);
  }

  tryDrop() {
    if (this.state !== 'playing' || this.paused) return;
    preloadAudio(); // first call wins; no-op after that — always inside a user gesture here
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

    playDropSound();
    this.shake.trigger(CONFIG.SCREEN_SHAKE_DROP, 120);

    this.currentTier = this.nextTier;
    this.nextTier = randomDroppableTier(this.droppableIndices);
    this.ui.setNextPreview(this.tiers[this.nextTier]);
  }

  handleCollisions(pairs) {
    for (const pair of pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;

      // Landing squash: fires once per body, on its first forceful contact
      // with *anything* (wall or fruit) — independent of whether a merge
      // happens. Checked for both bodies in every pair.
      this._maybeTriggerLanding(a);
      this._maybeTriggerLanding(b);

      if (a.label !== 'item' || b.label !== 'item') continue;
      if (this.consumedThisStep.has(a.id) || this.consumedThisStep.has(b.id)) continue;
      if (a.tier !== b.tier) continue;

      this.consumedThisStep.add(a.id);
      this.consumedThisStep.add(b.id);
      this._resolveMerge(a, b);
    }
  }

  _maybeTriggerLanding(body) {
    if (body.label !== 'item' || body.hasLanded) return;
    const now = performance.now();
    // Wait until its spawn-in pop has finished so the two effects never
    // visually fight each other on the same fruit.
    if (now - body.spawnTime < CONFIG.POP_TWEEN_MS) return;
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    if (speed < CONFIG.LANDING_MIN_IMPACT_SPEED) return;
    body.hasLanded = true;
    this.landingSquashes.set(body.itemId, now);
    playLandSound();
  }

  _resolveMerge(a, b) {
    const tier = a.tier;
    const mx = (a.position.x + b.position.x) / 2;
    const my = (a.position.y + b.position.y) / 2;
    const color = this.tiers[tier].color;

    this.physics.removeBody(a);
    this.physics.removeBody(b);
    this.popTweens.delete(a.itemId);
    this.popTweens.delete(b.itemId);
    this.landingSquashes.delete(a.itemId);
    this.landingSquashes.delete(b.itemId);

    this.particles.spawnBurst(mx, my, color, tier);
    playMergeSound(tier);

    // Combo tracking: merges chained within COMBO_WINDOW_MS of each other
    // build a streak; a gap longer than that starts a fresh chain at 1.
    const now = performance.now();
    this.comboCount = now - this.lastMergeTime <= CONFIG.COMBO_WINDOW_MS ? this.comboCount + 1 : 1;
    this.lastMergeTime = now;

    const isBigMerge = tier >= CONFIG.SCREEN_SHAKE_BIG_MERGE_TIER;

    // Bigger fruit merging = a bigger, longer screen shake — make the
    // top-tier merge feel like a genuine event.
    const shakeAmount = CONFIG.SCREEN_SHAKE_BASE_MERGE + tier * CONFIG.SCREEN_SHAKE_PER_TIER;
    this.shake.trigger(shakeAmount, 180 + tier * 40);

    let scoreGain;
    if (tier >= this.maxTierIndex) {
      // Top tier merge: no further item to spawn — big score bonus instead.
      scoreGain = this.tiers[tier].score * 2;
    } else {
      const newTier = tier + 1;
      const newBody = this.physics.addItem(mx, my, newTier, this.tiers[newTier].radius);
      this.popTweens.set(newBody.itemId, now);
      scoreGain = this.tiers[newTier].score;
    }

    this.score += scoreGain;
    this.ui.reportLiveScore(this.score);

    // XP mirrors the score gained from this merge — simple, consistent, and
    // means a player chasing a high score is automatically also leveling up.
    const xpResult = addXP(scoreGain);

    // --- Juice: floating text -------------------------------------------
    this.floatingText.spawnScore(mx, my, scoreGain, color);
    if (isBigMerge) {
      const callout = BIG_MERGE_CALLOUTS[Math.floor(Math.random() * BIG_MERGE_CALLOUTS.length)];
      this.floatingText.spawnCallout(mx, my, callout, '#fff');
    }
    if (this.comboCount >= 2) {
      this.floatingText.spawnCombo(mx, my, this.comboCount);
      playComboSound(this.comboCount);
    }
    if (xpResult.leveledUp) {
      this.floatingText.spawnCallout(mx, my - 26, 'LEVEL UP!', '#FFC857');
      playLevelUpSound();
      this.shake.trigger(9, 260);
    }
  }

  _updateDangerTimer(dtMs) {
    const now = performance.now();
    let dangerous = false;

    for (const body of this.physics.getItemBodies()) {
      const age = now - body.spawnTime;
      if (age < CONFIG.DANGER_GRACE_MS) continue; // still falling in from the dropper
      // Only the vertical component counts as "settled." Wind (Tropical/
      // Winter themes) only ever pushes horizontally, so a fruit gently
      // swaying side to side while otherwise resting still correctly
      // counts as dangerous — wind can never accidentally stop the player
      // from losing.
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

    // The "fear" beat: re-triggers faster and pitches up the closer the
    // player is to actually losing — silent the instant the stack is no
    // longer dangerous, so it never lingers past the moment of real risk.
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

  _triggerGameOver() {
    this.state = 'gameover';
    playGameOverSound();
    this.shake.trigger(11, 320);
    recordScore(this.score); // local leaderboard — see js/leaderboard.js
    this.ui.showGameOver(this.score);
  }

  _loop(now) {
    const dtMs = Math.min(now - this.lastFrameTime, 33);
    this.lastFrameTime = now;
    this.consumedThisStep.clear();

    if (this.state === 'playing' && !this.paused) {
      const moveAmount = (CONFIG.DROPPER_MOVE_SPEED * dtMs) / 1000;
      if (this.input.holdLeft) this.setDropperX(this.dropperX - moveAmount);
      if (this.input.holdRight) this.setDropperX(this.dropperX + moveAmount);

      this.physics.step(dtMs);
      this.physics.applyWind(this.theme.modifiers.windStrength, dtMs);
      this._updateDangerTimer(dtMs);
      this.ui.setScore(this.score);
    }

    if (!this.paused) {
      this.particles.update(dtMs);
      this.floatingText.update(dtMs);
      this.shake.update(dtMs);
    }

    this._render();
    requestAnimationFrame((t) => this._loop(t));
  }

  // ---- Rendering -----------------------------------------------------

  _render() {
    const ctx = this.ctx;
    const { x: shakeX, y: shakeY } = this.shake.offset;

    ctx.clearRect(0, 0, CONFIG.BOX_WIDTH, CONFIG.BOX_HEIGHT);
    ctx.save();
    ctx.translate(shakeX, shakeY);

    this._drawJar(ctx);
    this._drawItems(ctx);
    this._drawDropperGuide(ctx);
    this.particles.draw(ctx);
    this.floatingText.draw(ctx);

    ctx.restore();
  }

  _drawJar(ctx) {
    const left = this.physics.playLeft;
    const right = this.physics.playRight;
    const width = right - left;

    // Dead-margin side panels (only visible when a theme narrows the jar) —
    // drawn as solid "wall" slabs so the narrower play area reads as a real
    // physical constraint, not a rendering glitch.
    if (left > 0.5) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(0, 0, left, CONFIG.BOX_HEIGHT);
      ctx.fillRect(right, 0, CONFIG.BOX_WIDTH - right, CONFIG.BOX_HEIGHT);
    }

    // Soft glass-jar backdrop within the actual playable interior.
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CONFIG.BOX_HEIGHT);
    bgGrad.addColorStop(0, 'rgba(255,255,255,0.05)');
    bgGrad.addColorStop(1, 'rgba(255,255,255,0.015)');
    ctx.fillStyle = bgGrad;
    roundRectPath(ctx, left + 2, 2, width - 4, CONFIG.BOX_HEIGHT - 4, 18);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.stroke();

    // top rim highlight
    ctx.beginPath();
    ctx.moveTo(left + 16, 4);
    ctx.lineTo(right - 16, 4);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();
  }

  _drawItems(ctx) {
    const now = performance.now();
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

      drawFruit(ctx, tier, tier.kind, body.position.x, body.position.y, tier.radius, scaleX, scaleY);
    }
  }

  _drawDropperGuide(ctx) {
    if (this.state !== 'playing') return;
    const tier = this.tiers[this.currentTier];

    // Ghost guide line: a faint dashed vertical line straight down from the
    // current aim position, so players can precisely line up a drop before
    // committing to it.
    ctx.save();
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.dropperX, CONFIG.DROPPER_Y + tier.radius);
    ctx.lineTo(this.dropperX, CONFIG.BOX_HEIGHT);
    ctx.stroke();
    ctx.restore();

    drawFruit(ctx, tier, tier.kind, this.dropperX, CONFIG.DROPPER_Y, tier.radius);
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
