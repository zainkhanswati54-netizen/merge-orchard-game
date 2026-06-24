import { easeOutQuad } from './utils.js';

class FloatingText {
  constructor(x, y, text, { color = '#fff', startSize = 18, growTo = null, lifeMs = 900, vy = -1.1 } = {}) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.startSize = startSize;
    this.growTo = growTo; // if set, font size eases from startSize -> growTo over the popup's life (combo emphasis)
    this.life = lifeMs;
    this.maxLife = lifeMs;
    this.vy = vy;
    this.driftX = (Math.random() - 0.5) * 0.4; // tiny horizontal wander so stacked popups don't perfectly overlap
  }

  update(dtMs) {
    const dt = dtMs / 16.6667;
    this.y += this.vy * dt;
    this.x += this.driftX * dt;
    this.life -= dtMs;
  }

  get progress() {
    return 1 - Math.max(0, this.life) / this.maxLife;
  }

  get alpha() {
    // hold at full opacity briefly, then fade over the back half of its life
    const p = this.progress;
    return p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45;
  }

  get fontSize() {
    if (!this.growTo) return this.startSize;
    return this.startSize + (this.growTo - this.startSize) * easeOutQuad(Math.min(1, this.progress * 2.2));
  }

  get dead() {
    return this.life <= 0;
  }
}

export class FloatingTextSystem {
  constructor() {
    this.items = [];
  }

  // Plain "+N" score popup at a merge point.
  spawnScore(x, y, amount, color) {
    this.items.push(new FloatingText(x, y, `+${amount}`, { color, startSize: 16 }));
  }

  // A reward-flavor word ("SPLASH!", "JUICY!") for big merges — visually
  // distinct from the score number so it reads as a bonus callout.
  spawnCallout(x, y, text, color) {
    this.items.push(new FloatingText(x, y - 8, text, { color, startSize: 20, lifeMs: 950, vy: -1.3 }));
  }

  // Combo text grows with the multiplier — "Combo x2" is modest, "Combo x5"
  // is genuinely large — to reward the player for chaining merges.
  spawnCombo(x, y, comboCount) {
    const size = Math.min(34, 16 + comboCount * 3);
    this.items.push(
      new FloatingText(x, y - 24, `COMBO x${comboCount}`, {
        color: '#FFC857',
        startSize: size * 0.6,
        growTo: size,
        lifeMs: 1000,
        vy: -0.9,
      })
    );
  }

  update(dtMs) {
    for (const t of this.items) t.update(dtMs);
    this.items = this.items.filter((t) => !t.dead);
  }

  draw(ctx) {
    for (const t of this.items) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.font = `800 ${t.fontSize}px "Baloo 2", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
