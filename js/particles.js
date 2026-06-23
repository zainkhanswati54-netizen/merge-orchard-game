import { randRange } from './utils.js';

class Particle {
  constructor(x, y, vx, vy, radius, color, lifeMs) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.life = lifeMs;
    this.maxLife = lifeMs;
  }

  update(dtMs) {
    const dt = dtMs / 16.6667; // normalize roughly to 60fps step units
    this.vy += 0.18 * dt;      // light gravity pull
    this.vx *= 0.985;
    this.vy *= 0.985;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dtMs;
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }

  get dead() {
    return this.life <= 0;
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // Bigger tier => bigger, longer, more energetic burst. That scaling is
  // what makes a tiny cherry-merge feel small and a watermelon-merge feel huge.
  spawnBurst(x, y, color, tier) {
    const count = 10 + tier * 6;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randRange(1.5, 4 + tier * 1.4);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const radius = randRange(1.5, 3.5 + tier * 0.6);
      const life = randRange(350, 650 + tier * 60);
      this.particles.push(new Particle(x, y, vx, vy, radius, color, life));
    }
  }

  // Tiny colour-matched wisp trailing behind a falling body. Called every
  // frame while the body is in fast descent; particles drift upward so they
  // look like a wake left in the air.
  spawnTrail(x, y, color) {
    for (let i = 0; i < 2; i++) {
      const vx = randRange(-0.7, 0.7);
      const vy = randRange(-1.8, -0.4);
      const radius = randRange(1.0, 2.3);
      const life   = randRange(130, 220);
      this.particles.push(new Particle(x, y, vx, vy, radius, color, life));
    }
  }

  update(dtMs) {
    for (const p of this.particles) p.update(dtMs);
    this.particles = this.particles.filter((p) => !p.dead);
  }

  draw(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
