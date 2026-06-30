// ---------------------------------------------------------------------------
// WEATHER SYSTEM
// ---------------------------------------------------------------------------
// Purely visual weather effects drawn on top of the game canvas each frame.
// Does not affect physics (physics wind is handled separately in themes.js).
// ---------------------------------------------------------------------------

export const WEATHER_TYPES = ['none', 'rain', 'snow', 'meteor'];

export class WeatherSystem {
  constructor() {
    this.type = 'none';
    this.particles = [];
    this._elapsed = 0;
  }

  setWeather(type) {
    this.type = type;
    this.particles = [];
    if (type === 'rain') this._initRain();
    else if (type === 'snow') this._initSnow();
    else if (type === 'meteor') this._initMeteor();
  }

  randomWeather(themes) {
    const weights = ['none', 'none', 'none', 'rain', 'rain', 'snow', 'snow', 'meteor'];
    this.setWeather(weights[Math.floor(Math.random() * weights.length)]);
  }

  _initRain() {
    for (let i = 0; i < 45; i++) {
      this.particles.push({
        x: Math.random() * 360,
        y: Math.random() * 560,
        speed: 6 + Math.random() * 6,
        len: 8 + Math.random() * 10,
        alpha: 0.2 + Math.random() * 0.35,
      });
    }
  }

  _initSnow() {
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * 360,
        y: Math.random() * 560,
        r: 1.5 + Math.random() * 3,
        speed: 0.5 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 0.6,
        alpha: 0.3 + Math.random() * 0.5,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  }

  _initMeteor() {
    this.particles = [];
    this._nextMeteorAt = 0;
  }

  _spawnMeteor() {
    this.particles.push({
      x: 20 + Math.random() * 320,
      y: -10,
      vx: (Math.random() - 0.5) * 2,
      vy: 8 + Math.random() * 6,
      len: 18 + Math.random() * 20,
      alpha: 0.7 + Math.random() * 0.3,
      life: 1,
    });
  }

  update(dtMs, canvasW, canvasH) {
    this._elapsed += dtMs;
    if (this.type === 'rain') this._updateRain(dtMs, canvasW, canvasH);
    else if (this.type === 'snow') this._updateSnow(dtMs, canvasW, canvasH);
    else if (this.type === 'meteor') this._updateMeteor(dtMs, canvasW, canvasH);
  }

  _updateRain(dtMs, W, H) {
    const dt = dtMs / 16.667;
    for (const p of this.particles) {
      p.y += p.speed * dt;
      p.x += 1.2 * dt;
      if (p.y > H) { p.y = -p.len; p.x = Math.random() * W; }
    }
  }

  _updateSnow(dtMs, W, H) {
    const dt = dtMs / 16.667;
    for (const p of this.particles) {
      p.wobble += 0.02 * dt;
      p.x += Math.sin(p.wobble) * p.drift * dt;
      p.y += p.speed * dt;
      if (p.y > H) { p.y = -p.r * 2; p.x = Math.random() * W; }
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
    }
  }

  _updateMeteor(dtMs, W, H) {
    const dt = dtMs / 16.667;
    this._nextMeteorAt -= dtMs;
    if (this._nextMeteorAt <= 0) {
      this._spawnMeteor();
      this._nextMeteorAt = 600 + Math.random() * 1400;
    }
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= 0.012 * dt;
      return p.y < H + 20 && p.life > 0;
    });
  }

  draw(ctx, W, H) {
    if (this.type === 'none') return;
    ctx.save();
    if (this.type === 'rain') this._drawRain(ctx);
    else if (this.type === 'snow') this._drawSnow(ctx);
    else if (this.type === 'meteor') this._drawMeteor(ctx);
    ctx.restore();
  }

  _drawRain(ctx) {
    ctx.strokeStyle = '#8FC7FF';
    ctx.lineWidth = 1;
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 2, p.y - p.len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawSnow(ctx) {
    ctx.fillStyle = '#ffffff';
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawMeteor(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha * p.life;
      const grad = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * p.len * 0.15, p.y - p.vy * p.len * 0.15);
      grad.addColorStop(0, '#FFF8DC');
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * p.len * 0.15, p.y - p.vy * p.len * 0.15);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
