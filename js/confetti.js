// ---------------------------------------------------------------------------
// CONFETTI
// ---------------------------------------------------------------------------
// A small, self-contained burst animation for the "New High Score!" moment.
// Deliberately separate from the main game's ParticleSystem (js/particles.js)
// because it runs on its own canvas inside the Game Over modal, in screen
// (pixel) space, and uses rectangle/triangle confetti shapes rather than
// circular juice-splatter particles — a different visual vocabulary for a
// different moment (celebration banner vs. in-jar merge).
// ---------------------------------------------------------------------------

const COLORS = ['#FF6B5B', '#FFC857', '#8BC34A', '#4FC3F7', '#E0479E', '#FFD23F'];

class ConfettiPiece {
  constructor(x, y, width) {
    this.x = x + (Math.random() - 0.5) * width;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 5.5;
    this.vy = -(Math.random() * 6 + 4); // launch upward, gravity pulls it back down
    this.size = 5 + Math.random() * 5;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.3;
    this.shape = Math.random() < 0.5 ? 'rect' : 'triangle';
    this.life = 1400 + Math.random() * 500;
    this.maxLife = this.life;
  }

  update(dtMs) {
    const dt = dtMs / 16.6667;
    this.vy += 0.16 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed * dt;
    this.life -= dtMs;
  }

  get alpha() {
    return Math.max(0, Math.min(1, this.life / (this.maxLife * 0.4)));
  }

  get dead() {
    return this.life <= 0;
  }
}

export class ConfettiBurst {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.pieces = [];
    this.running = false;
    this._lastTime = 0;
  }

  // originX/originY in canvas pixel space — typically top-center of the
  // modal card, just above the score, so confetti rains down over it.
  burst(originX, originY, count = 70) {
    for (let i = 0; i < count; i++) {
      this.pieces.push(new ConfettiPiece(originX, originY, this.canvas.width * 0.7));
    }
    if (!this.running) {
      this.running = true;
      this._lastTime = performance.now();
      requestAnimationFrame((t) => this._loop(t));
    }
  }

  _loop(now) {
    const dtMs = Math.min(now - this._lastTime, 33);
    this._lastTime = now;

    for (const p of this.pieces) p.update(dtMs);
    this.pieces = this.pieces.filter((p) => !p.dead);

    this._render();

    if (this.pieces.length > 0) {
      requestAnimationFrame((t) => this._loop(t));
    } else {
      this.running = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const p of this.pieces) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -p.size / 2);
        ctx.lineTo(p.size / 2, p.size / 2);
        ctx.lineTo(-p.size / 2, p.size / 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.pieces = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
