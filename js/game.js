import { CONFIG } from './config.js';
import { TIERS, MAX_TIER_INDEX, randomDroppableTier } from './items.js';
import { PhysicsWorld } from './physics.js';
import { ParticleSystem } from './particles.js';
import { ScreenShake } from './screenshake.js';
import { UI } from './ui.js';
import { InputController } from './input.js';
import { playDropSound, playMergeSound, playGameOverSound } from './audio.js';
import { clamp, popScale } from './utils.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.physics = new PhysicsWorld();
    this.particles = new ParticleSystem();
    this.shake = new ScreenShake();
    this.ui = new UI({ onRestart: () => this.restart() });
    this.input = new InputController(canvas, {
      onAimToX: (x) => this.setDropperX(x),
      onDrop: () => this.tryDrop(),
    });

    this.popTweens = new Map();      // itemId -> spawnTimestamp
    this.consumedThisStep = new Set();

    this.physics.onCollisionStart((pairs) => this.handleCollisions(pairs));

    this._resetState();

    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  _resetState() {
    this.score = 0;
    this.state = 'playing';
    this.dangerTimer = 0;
    this.dropperX = CONFIG.BOX_WIDTH / 2;
    this.nextDropAllowedAt = 0;
    this.currentTier = randomDroppableTier(CONFIG.DROPPABLE_TIER_INDICES);
    this.nextTier = randomDroppableTier(CONFIG.DROPPABLE_TIER_INDICES);
    this.ui.setScore(0);
    this.ui.setNextPreview(this.nextTier);
    this.ui.hideGameOver();
  }

  restart() {
    for (const body of this.physics.getItemBodies()) this.physics.removeBody(body);
    this.popTweens.clear();
    this._resetState();
  }

  setDropperX(x) {
    if (this.state !== 'playing') return;
    const r = TIERS[this.currentTier].radius;
    this.dropperX = clamp(x, r, CONFIG.BOX_WIDTH - r);
  }

  tryDrop() {
    if (this.state !== 'playing') return;
    const now = performance.now();
    if (now < this.nextDropAllowedAt) return;
    this.nextDropAllowedAt = now + CONFIG.DROP_COOLDOWN_MS;

    const tier = this.currentTier;
    const radius = TIERS[tier].radius;
    const x = clamp(this.dropperX, radius, CONFIG.BOX_WIDTH - radius);
    const body = this.physics.addItem(x, CONFIG.DROPPER_Y, tier, radius);
    this.popTweens.set(body.itemId, now);

    playDropSound();
    this.shake.trigger(CONFIG.SCREEN_SHAKE_DROP, 120);

    this.currentTier = this.nextTier;
    this.nextTier = randomDroppableTier(CONFIG.DROPPABLE_TIER_INDICES);
    this.ui.setNextPreview(this.nextTier);
  }

  handleCollisions(pairs) {
    for (const pair of pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      if (a.label !== 'item' || b.label !== 'item') continue;
      if (this.consumedThisStep.has(a.id) || this.consumedThisStep.has(b.id)) continue;
      if (a.tier !== b.tier) continue;

      this.consumedThisStep.add(a.id);
      this.consumedThisStep.add(b.id);
      this._resolveMerge(a, b);
    }
  }

  _resolveMerge(a, b) {
    const tier = a.tier;
    const mx = (a.position.x + b.position.x) / 2;
    const my = (a.position.y + b.position.y) / 2;
    const color = TIERS[tier].color;

    this.physics.removeBody(a);
    this.physics.removeBody(b);
    this.popTweens.delete(a.itemId);
    this.popTweens.delete(b.itemId);

    this.particles.spawnBurst(mx, my, color, tier);
    playMergeSound(tier);

    const shakeAmount = CONFIG.SCREEN_SHAKE_BASE_MERGE + tier * CONFIG.SCREEN_SHAKE_PER_TIER;
    this.shake.trigger(shakeAmount, 180 + tier * 40);

    if (tier >= MAX_TIER_INDEX) {
      // Top tier merge: no further item to spawn — big score bonus instead.
      this.score += TIERS[tier].score * 2;
      return;
    }

    const newTier = tier + 1;
    const newBody = this.physics.addItem(mx, my, newTier, TIERS[newTier].radius);
    this.popTweens.set(newBody.itemId, performance.now());
    this.score += TIERS[newTier].score;
  }

  _updateDangerTimer(dtMs) {
    const now = performance.now();
    let dangerous = false;

    for (const body of this.physics.getItemBodies()) {
      const age = now - body.spawnTime;
      if (age < CONFIG.DANGER_GRACE_MS) continue; // still falling in from the dropper
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      const topEdge = body.position.y - body.circleRadius;
      if (topEdge < CONFIG.DANGER_LINE_Y && speed < CONFIG.DANGER_SETTLE_SPEED) {
        dangerous = true;
        break;
      }
    }

    this.dangerTimer = dangerous ? this.dangerTimer + dtMs : 0;
    this.ui.setDangerProgress(this.dangerTimer / CONFIG.DANGER_TIME_LIMIT_MS);

    if (this.dangerTimer >= CONFIG.DANGER_TIME_LIMIT_MS) {
      this._triggerGameOver();
    }
  }

  _triggerGameOver() {
    this.state = 'gameover';
    playGameOverSound();
    this.shake.trigger(11, 320);
    this.ui.showGameOver(this.score);
  }

  _loop(now) {
    const dtMs = Math.min(now - this.lastFrameTime, 33);
    this.lastFrameTime = now;
    this.consumedThisStep.clear();

    if (this.state === 'playing') {
      const moveAmount = (CONFIG.DROPPER_MOVE_SPEED * dtMs) / 1000;
      if (this.input.holdLeft) this.setDropperX(this.dropperX - moveAmount);
      if (this.input.holdRight) this.setDropperX(this.dropperX + moveAmount);

      this.physics.step(dtMs);
      this._updateDangerTimer(dtMs);
      this.ui.setScore(this.score);
    }

    this.particles.update(dtMs);
    this.shake.update(dtMs);

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

    ctx.restore();
  }

  _drawJar(ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    roundRectPath(ctx, 2, 2, CONFIG.BOX_WIDTH - 4, CONFIG.BOX_HEIGHT - 4, 18);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.stroke();
  }

  _drawItems(ctx) {
    const now = performance.now();
    for (const body of this.physics.getItemBodies()) {
      const tier = TIERS[body.tier];
      let scale = 1;
      const spawnedAt = this.popTweens.get(body.itemId);
      if (spawnedAt !== undefined) {
        const t = (now - spawnedAt) / CONFIG.POP_TWEEN_MS;
        if (t >= 1) {
          this.popTweens.delete(body.itemId);
        } else {
          scale = popScale(t);
        }
      }
      drawFruit(ctx, body.position.x, body.position.y, tier.radius * scale, tier.color, tier.shade);
    }
  }

  _drawDropperGuide(ctx) {
    if (this.state !== 'playing') return;
    const tier = TIERS[this.currentTier];

    // faint vertical aim line
    ctx.save();
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.dropperX, CONFIG.DROPPER_Y + tier.radius);
    ctx.lineTo(this.dropperX, CONFIG.BOX_HEIGHT);
    ctx.stroke();
    ctx.restore();

    drawFruit(ctx, this.dropperX, CONFIG.DROPPER_Y, tier.radius, tier.color, tier.shade);
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

function drawFruit(ctx, x, y, radius, color, shade) {
  const grad = ctx.createRadialGradient(
    x - radius * 0.35, y - radius * 0.35, radius * 0.1,
    x, y, radius
  );
  grad.addColorStop(0, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, shade);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.stroke();
}
