// ===========================================================================
// JUICE ENGINE — Psychology-driven animations + synthesized sounds
// ===========================================================================
// No extra sound files needed — everything generated via Web Audio API.
// Covers: merge explosions, combo escalation, drop satisfying thud,
// screen flash, shockwave rings, coin rain, confetti burst, level-up fanfare,
// danger heartbeat pump, game-over dramatic sting.
// ===========================================================================

// ---------------------------------------------------------------------------
// SYNTHESIZED SOUND ENGINE
// ---------------------------------------------------------------------------
let _ac = null;
function ac() {
  if (!_ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _ac = new AC();
  }
  if (_ac.state === 'suspended') _ac.resume().catch(() => {});
  return _ac;
}

function synthNote({ type = 'sine', freq = 440, freqEnd = null, gain = 0.5,
                     attack = 0.005, decay = 0.1, sustain = 0, release = 0.1,
                     detune = 0, when = 0 } = {}) {
  const ctx = ac(); if (!ctx) return;
  const now = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + attack + decay + sustain + release);
  if (detune) osc.detune.setValueAtTime(detune, now);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.linearRampToValueAtTime(gain * 0.6, now + attack + decay);
  if (sustain > 0) g.gain.setValueAtTime(gain * 0.6, now + attack + decay + sustain);
  g.gain.linearRampToValueAtTime(0.0001, now + attack + decay + sustain + release);
  osc.connect(g).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + attack + decay + sustain + release + 0.05);
}

function synthNoise({ gain = 0.3, attack = 0.002, release = 0.12, when = 0, filter = null } = {}) {
  const ctx = ac(); if (!ctx) return;
  const now = ctx.currentTime + when;
  const bufSize = ctx.sampleRate * (attack + release + 0.05);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = filter.type || 'bandpass';
    f.frequency.value = filter.freq || 800;
    f.Q.value = filter.q || 1;
    source.connect(f).connect(g).connect(ctx.destination);
  } else {
    source.connect(g).connect(ctx.destination);
  }
  source.start(now);
}

// ---------------------------------------------------------------------------
// SOUND PRESETS — psychology-tuned
// ---------------------------------------------------------------------------

export function soundDrop() {
  // Deep satisfying THUD — wood on earth feel
  synthNoise({ gain: 0.5, attack: 0.001, release: 0.12, filter: { type: 'lowpass', freq: 180, q: 2.5 } });
  synthNote({ type: 'sine', freq: 100, freqEnd: 48, gain: 0.4, attack: 0.001, decay: 0.15, release: 0.06 });
  // High click transient
  synthNote({ type: 'sine', freq: 1200, freqEnd: 600, gain: 0.08, attack: 0.001, decay: 0.015, release: 0.01 });
}

export function soundMerge(tier) {
  const t = Math.min(1, tier / 7);
  // Small: crisp juicy pop (like bubble wrap)
  // Big: deep resonant BOOM with overtones
  const baseFreq = 680 - t * 420;
  const freqEnd  = baseFreq * (2.2 - t * 1.2);
  const gainAmt  = 0.22 + t * 0.5;
  // Main body
  synthNote({ type: 'triangle', freq: baseFreq, freqEnd, gain: gainAmt, attack: 0.001, decay: 0.05 + t * 0.18, release: 0.06 + t * 0.14 });
  // Overtone shimmer (pitched higher)
  synthNote({ type: 'sine', freq: baseFreq * 2.5, freqEnd: freqEnd * 1.8, gain: gainAmt * 0.35, attack: 0.001, decay: 0.03 + t * 0.06, release: 0.05 });
  // Sub thud (tier 3+)
  if (tier >= 3) synthNote({ type: 'sine', freq: 80 - t*30, freqEnd: 30, gain: 0.18 + t*0.22, attack: 0.001, decay: 0.1 + t*0.12, release: 0.08 });
  // Impact noise (tier 4+)
  if (tier >= 4) synthNoise({ gain: 0.18 + t * 0.28, attack: 0.001, release: 0.06 + t*0.1, filter: { type: 'lowpass', freq: 150 + t*120, q: 1.8 } });
  // Magic sparkle on legendary
  if (tier >= 6) {
    [1600,2000,2500].forEach((f,i) => synthNote({ type:'sine', freq:f, freqEnd:f*0.6, gain:0.06, attack:0.002, decay:0.04, release:0.12, when:i*0.02 }));
  }
}

export function soundCombo(count) {
  // Rising musical scale — each combo MORE satisfying
  const pentatonic = [523,659,784,988,1175,1397,1568,1865,2093,2349];
  const idx = Math.min(count - 2, pentatonic.length - 1);
  const freq = pentatonic[idx];
  const gain = 0.28 + Math.min(0.3, count * 0.022);
  // Main ping
  synthNote({ type: 'sine', freq, freqEnd: freq * 1.12, gain, attack: 0.001, decay: 0.05, release: 0.18 });
  // Harmony note
  synthNote({ type: 'triangle', freq: freq * 1.5, gain: gain * 0.35, attack: 0.003, decay: 0.04, release: 0.1, when: 0.02 });
  if (count >= 5) {
    // Chord swell
    [1, 1.26, 1.5, 2].forEach((r, i) => synthNote({ type:'sine', freq:freq*r, gain:gain*0.25, attack:0.005, decay:0.06, sustain:0.02, release:0.14, when:i*0.03 }));
  }
  if (count >= 10) {
    // LEGENDARY — triumphant fanfare
    [523,659,784,1047,1319].forEach((f,i) => {
      synthNote({ type:'triangle', freq:f, freqEnd:f*1.05, gain:0.28, attack:0.008, decay:0.06, sustain:0.04, release:0.15, when:i*0.06 });
      synthNote({ type:'sine', freq:f*2, gain:0.12, attack:0.01, decay:0.03, release:0.1, when:i*0.06+0.03 });
    });
  }
}

export function soundLevelUp() {
  // Victorious 5-note ascending fanfare
  const melody = [523, 659, 784, 1047, 1319];
  melody.forEach((f, i) => {
    synthNote({ type: 'triangle', freq: f, freqEnd: f * 1.06, gain: 0.36, attack: 0.008, decay: 0.07, sustain: 0.05, release: 0.14, when: i * 0.09 });
    synthNote({ type: 'sine', freq: f * 2, gain: 0.14, attack: 0.012, decay: 0.03, release: 0.1, when: i * 0.09 + 0.02 });
    // Sub bass for punch
    if (i === 4) synthNote({ type:'sine', freq:131, freqEnd:65, gain:0.25, attack:0.001, decay:0.3, release:0.2, when:i*0.09 });
  });
}

export function soundCoinCollect() {
  // Mario-style coin — bright, short, addictive
  synthNote({ type: 'sine', freq: 1319, freqEnd: 1760, gain: 0.32, attack: 0.001, decay: 0.04, release: 0.1 });
  synthNote({ type: 'triangle', freq: 1760, gain: 0.16, attack: 0.001, decay: 0.03, release: 0.07, when: 0.05 });
}

export function soundGameOver() {
  // Dramatic descending sting — cinematic
  [220,185,165,147,110].forEach((f,i) => {
    synthNote({ type:'sawtooth', freq:f, freqEnd:f*0.8, gain:0.18+i*0.02, attack:0.02, decay:0.15, sustain:0.05, release:0.25, when:i*0.12 });
  });
  synthNote({ type:'sine', freq:55, freqEnd:27, gain:0.4, attack:0.01, decay:0.5, sustain:0.2, release:0.5, when:0.1 });
  synthNoise({ gain:0.12, attack:0.001, release:0.6, filter:{ type:'highpass', freq:800, q:0.5 } });
}

export function soundDanger(progress) {
  // Accelerating heartbeat — low thud
  const p = Math.max(0, progress);
  synthNote({ type:'sine', freq:55+p*30, freqEnd:38+p*15, gain:0.28+p*0.1, attack:0.001, decay:0.09+p*0.04, release:0.07 });
  if (p > 0.6) synthNote({ type:'sine', freq:110+p*40, freqEnd:80, gain:0.12, attack:0.001, decay:0.05, release:0.04, when:0.06 });
}

export function soundClick() {
  // Crisp UI tap
  synthNote({ type:'sine', freq:1100, freqEnd:800, gain:0.12, attack:0.001, decay:0.02, release:0.025 });
  synthNote({ type:'triangle', freq:1600, gain:0.05, attack:0.001, decay:0.012, release:0.015 });
}

export function soundUnlock() {
  // Magic unlock — shimmering arpeggio
  [523,659,784,1047,1319,1568].forEach((f, i) => {
    synthNote({ type:'sine', freq:f, freqEnd:f*1.08, gain:0.2, attack:0.003, decay:0.05, release:0.14, when:i*0.065 });
    synthNote({ type:'triangle', freq:f*2, gain:0.08, attack:0.005, decay:0.03, release:0.1, when:i*0.065+0.03 });
  });
}

// ---------------------------------------------------------------------------
// VISUAL JUICE SYSTEM
// ---------------------------------------------------------------------------

class ShockwaveRing {
  constructor(x, y, color, maxR) {
    this.x = x; this.y = y;
    this.color = color;
    this.r = 0;
    this.maxR = maxR;
    this.life = 1; // 0..1
    this.speed = maxR / 20; // grow over ~20 frames
  }
  update(dtMs) {
    const dt = dtMs / 16.667;
    this.r += this.speed * dt;
    this.life = Math.max(0, 1 - this.r / this.maxR);
  }
  get dead() { return this.life <= 0; }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life * 0.7;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3 * this.life;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class StarBurst {
  constructor(x, y, color, tier) {
    this.particles = [];
    const count = 8 + tier * 5;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 2.5 + tier * 1.2 + Math.random() * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2 + Math.random() * (2 + tier * 0.5),
        life: 1,
        decay: 0.018 + Math.random() * 0.01,
        color,
        spin: (Math.random() - 0.5) * 0.3,
        isStar: Math.random() < 0.4,
      });
    }
  }
  get dead() { return this.particles.every(p => p.life <= 0); }
  update(dtMs) {
    const dt = dtMs / 16.667;
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 0.12 * dt; // gravity
      p.vx *= 0.97; p.vy *= 0.97;
      p.life = Math.max(0, p.life - p.decay * dt);
    }
  }
  draw(ctx) {
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      if (p.isStar) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin * (1 - p.life) * 30);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const ia = a + Math.PI / 5;
          if (i === 0) ctx.moveTo(Math.cos(a) * p.r, Math.sin(a) * p.r);
          else ctx.lineTo(Math.cos(a) * p.r, Math.sin(a) * p.r);
          ctx.lineTo(Math.cos(ia) * p.r * 0.4, Math.sin(ia) * p.r * 0.4);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

class CoinSpark {
  constructor(x, y) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
    const speed = 3 + Math.random() * 3;
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1;
    this.decay = 0.022 + Math.random() * 0.012;
    this.size = 4 + Math.random() * 4;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.3;
  }
  get dead() { return this.life <= 0; }
  update(dtMs) {
    const dt = dtMs / 16.667;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vy += 0.25 * dt;
    this.vx *= 0.96;
    this.life = Math.max(0, this.life - this.decay * dt);
    this.rotation += this.rotSpeed * dt;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FFA000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size * 0.5, this.size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

class ScreenFlash {
  constructor(color, intensity) {
    this.color = color;
    this.life = intensity; // 0..1
    this.decay = 0.08;
  }
  get dead() { return this.life <= 0; }
  update(dtMs) {
    const dt = dtMs / 16.667;
    this.life = Math.max(0, this.life - this.decay * dt);
  }
  draw(ctx, w, h) {
    ctx.save();
    ctx.globalAlpha = this.life * 0.35;
    ctx.fillStyle = this.color;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

class ComboTextBurst {
  constructor(x, y, count) {
    this.x = x; this.y = y;
    this.count = count;
    this.life = 1;
    this.scale = 0.3;
    this.targetScale = 1 + Math.min(count - 2, 8) * 0.08;
    this.vy = -0.6;
    this.decay = 0.014;
    this.color = count >= 10 ? '#FF1744' : count >= 5 ? '#FF6D00' : '#FFC857';
  }
  get dead() { return this.life <= 0; }
  update(dtMs) {
    const dt = dtMs / 16.667;
    this.scale = Math.min(this.targetScale, this.scale + 0.12 * dt);
    this.y += this.vy * dt;
    this.life = Math.max(0, this.life - this.decay * dt);
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    const label = this.count >= 10 ? `🔥 LEGENDARY x${this.count}` : `COMBO x${this.count}`;
    const size = 18 + Math.min(this.count - 2, 8) * 2.5;
    ctx.font = `900 ${size}px "Baloo 2", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeText(label, 0, 0);
    ctx.fillStyle = this.color;
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
}


// ---------------------------------------------------------------------------
// POWER SOUNDS — each power has unique audio identity
// ---------------------------------------------------------------------------

export function soundPowerLightning() {
  const ctx = ac(); if (!ctx) return;
  const now = ctx.currentTime;

  // 1. Initial CRACK — ultra sharp transient
  synthNoise({ gain: 0.9, attack: 0.001, release: 0.04, filter: { type: 'highpass', freq: 4000, q: 0.5 } });
  // 2. Thunderclap body
  synthNoise({ gain: 0.6, attack: 0.001, release: 0.22, filter: { type: 'bandpass', freq: 400, q: 0.8 } });
  // 3. Electric whip — descending fast
  synthNote({ type: 'sawtooth', freq: 1800, freqEnd: 80, gain: 0.45, attack: 0.001, decay: 0.12, release: 0.08 });
  synthNote({ type: 'square',   freq: 3200, freqEnd: 200, gain: 0.25, attack: 0.001, decay: 0.06, release: 0.05 });
  // 4. Sizzle crackle tail — feels like real electricity
  [0, 0.04, 0.08, 0.13, 0.19, 0.26].forEach((d, i) => {
    synthNoise({ gain: 0.18 - i*0.025, attack: 0.001, release: 0.04,
      filter: { type: 'bandpass', freq: 2000 + i*500, q: 3 }, when: d });
  });
  // 5. Low rumble (thunder feel)
  synthNote({ type: 'sine', freq: 55, freqEnd: 30, gain: 0.3, attack: 0.005, decay: 0.3, release: 0.2, when: 0.02 });
  // 6. High electric zing
  synthNote({ type: 'sine', freq: 2400, freqEnd: 800, gain: 0.12, attack: 0.001, decay: 0.08, release: 0.12, when: 0.01 });
}

export function soundPowerMagnet() {
  const ctx = ac(); if (!ctx) return;

  // 1. Power-up whir — machinery spinning up
  synthNote({ type: 'sawtooth', freq: 60,  freqEnd: 280, gain: 0.28, attack: 0.04, decay: 0.25, sustain: 0.3, release: 0.4 });
  synthNote({ type: 'sawtooth', freq: 120, freqEnd: 560, gain: 0.18, attack: 0.05, decay: 0.2,  sustain: 0.25, release: 0.35, when: 0.02 });
  // 2. Metallic hum — classic magnet sound
  synthNote({ type: 'sine', freq: 180, freqEnd: 360, gain: 0.22, attack: 0.08, decay: 0.15, sustain: 0.4, release: 0.5, when: 0.03 });
  // 3. Whirring harmonics
  [240, 360, 480].forEach((f, i) =>
    synthNote({ type: 'triangle', freq: f, freqEnd: f*2.2, gain: 0.1-i*0.02, attack: 0.1, decay: 0.1, sustain: 0.3, release: 0.4, when: i*0.04 })
  );
  // 4. Activation PING — satisfying metallic clang
  synthNote({ type: 'sine', freq: 1400, freqEnd: 700, gain: 0.22, attack: 0.001, decay: 0.08, release: 0.25, when: 0.12 });
  synthNote({ type: 'sine', freq: 2100, freqEnd: 1050, gain: 0.12, attack: 0.001, decay: 0.06, release: 0.2, when: 0.14 });
  // 5. Noise burst — magnetic field activation
  synthNoise({ gain: 0.2, attack: 0.001, release: 0.12, filter: { type: 'bandpass', freq: 600, q: 2 }, when: 0.1 });
}

export function soundPowerBomb() {
  const ctx = ac(); if (!ctx) return;

  // 1. Fuse ignite — short fizz before explosion
  synthNoise({ gain: 0.3, attack: 0.001, release: 0.08, filter: { type: 'highpass', freq: 3000, q: 1 } });
  // 2. BOOM — massive sub-bass impact
  synthNote({ type: 'sine', freq: 80, freqEnd: 12, gain: 0.75, attack: 0.001, decay: 0.55, release: 0.4, when: 0.06 });
  synthNote({ type: 'sine', freq: 40, freqEnd: 8,  gain: 0.6,  attack: 0.001, decay: 0.7,  release: 0.5, when: 0.06 });
  // 3. Explosion body noise
  synthNoise({ gain: 0.85, attack: 0.001, release: 0.45, filter: { type: 'lowpass', freq: 350, q: 1 }, when: 0.06 });
  // 4. Mid crack — punch
  synthNoise({ gain: 0.5, attack: 0.001, release: 0.18, filter: { type: 'bandpass', freq: 700, q: 1.5 }, when: 0.06 });
  // 5. High debris scatter
  synthNoise({ gain: 0.25, attack: 0.002, release: 0.35, filter: { type: 'highpass', freq: 2000, q: 0.8 }, when: 0.08 });
  // 6. Shockwave ring — pressure wave feel
  synthNote({ type: 'sine', freq: 200, freqEnd: 30, gain: 0.2, attack: 0.005, decay: 0.4, release: 0.3, when: 0.07 });
  // 7. Ringing aftermath — ears ringing effect
  synthNote({ type: 'sine', freq: 3500, freqEnd: 2000, gain: 0.08, attack: 0.02, decay: 0.4, release: 0.8, when: 0.15 });
  synthNote({ type: 'sine', freq: 2800, freqEnd: 1800, gain: 0.06, attack: 0.02, decay: 0.3, release: 0.7, when: 0.18 });
}

export function soundPowerRainbow() {
  const ctx = ac(); if (!ctx) return;

  // 1. Magical whoosh — wind up
  synthNoise({ gain: 0.15, attack: 0.05, release: 0.4, filter: { type: 'bandpass', freq: 1200, q: 0.5 } });
  // 2. Rainbow arpeggio — full chromatic cascade
  const notes = [392, 494, 587, 698, 784, 988, 1175, 1319, 1568, 1865, 2093];
  notes.forEach((f, i) => {
    synthNote({ type: 'sine',     freq: f, freqEnd: f*1.2, gain: 0.22, attack: 0.001, decay: 0.04, release: 0.22, when: i*0.038 });
    synthNote({ type: 'triangle', freq: f*2, gain: 0.1, attack: 0.002, decay: 0.03, release: 0.15, when: i*0.038+0.015 });
    // Stereo shimmer
    synthNote({ type: 'sine', freq: f*1.5, gain: 0.06, attack: 0.003, decay: 0.025, release: 0.1, when: i*0.038+0.025 });
  });
  // 3. Dreamy pad — sustained magical atmosphere
  [523, 659, 784, 1047].forEach((f, i) =>
    synthNote({ type: 'sine', freq: f, gain: 0.08, attack: 0.06, decay: 0.1, sustain: 0.3, release: 0.5, when: i*0.02 })
  );
  // 4. Sparkle finish — high glitter
  [2093, 2637, 3136, 3951].forEach((f, i) =>
    synthNote({ type: 'sine', freq: f, gain: 0.07, attack: 0.001, decay: 0.03, release: 0.18, when: 0.32 + i*0.04 })
  );
}

// ---------------------------------------------------------------------------
// POWER VISUAL PARTICLES
// ---------------------------------------------------------------------------

class LightningBolt {
  constructor(x1, y1, x2, y2, delay = 0) {
    this.life = 1;
    this.decay = 0.045;
    this.delay = delay;
    this.age = 0;
    // Multiple bolt variations for flicker effect
    this.bolts = [
      this._buildZigzag(x1, y1, x2, y2, 14),
      this._buildZigzag(x1, y1, x2, y2, 12),
      this._buildZigzag(x1, y1, x2, y2, 10),
    ];
    this.branches = this._buildBranches(this.bolts[0]);
    this.sparks = this._buildSparks(x2, y2);
    this.flickerTimer = 0;
    this.activeBolt = 0;
    this.x2 = x2; this.y2 = y2;
  }
  _buildZigzag(x1, y1, x2, y2, n) {
    const pts = [{x: x1, y: y1}];
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const jitter = (Math.random() - 0.5) * 40;
      pts.push({ x: x1 + (x2-x1)*t + jitter, y: y1 + (y2-y1)*t + (Math.random()-0.5)*20 });
    }
    pts.push({x: x2, y: y2});
    return pts;
  }
  _buildBranches(segs) {
    const branches = [];
    for (let i = 0; i < 7; i++) {
      const idx = 2 + Math.floor(Math.random() * (segs.length - 4));
      const p = segs[idx];
      const angle = Math.random() * Math.PI * 2;
      const len = 20 + Math.random() * 45;
      const sub = { x1: p.x, y1: p.y, x2: p.x + Math.cos(angle)*len, y2: p.y + Math.sin(angle)*len };
      // Sub-branches
      const subAngle = angle + (Math.random()-0.5)*1.2;
      const subLen = len * 0.5;
      sub.sub = { x1: sub.x2, y1: sub.y2, x2: sub.x2 + Math.cos(subAngle)*subLen, y2: sub.y2 + Math.sin(subAngle)*subLen };
      branches.push(sub);
    }
    return branches;
  }
  _buildSparks(x, y) {
    const sparks = [];
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      sparks.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life: 1, decay: 0.04 + Math.random()*0.03 });
    }
    return sparks;
  }
  get dead() { return this.life <= 0; }
  update(dtMs) {
    this.age += dtMs;
    if (this.age < this.delay) return;
    const dt = dtMs / 16.667;
    this.life = Math.max(0, this.life - this.decay * dt);
    // Flicker between bolt variants
    this.flickerTimer += dtMs;
    if (this.flickerTimer > 40) { this.activeBolt = (this.activeBolt+1) % this.bolts.length; this.flickerTimer = 0; }
    this.sparks.forEach(s => { s.x+=s.vx*dt; s.y+=s.vy*dt; s.vy+=0.15*dt; s.life=Math.max(0,s.life-s.decay*dt); });
  }
  draw(ctx) {
    if (this.age < this.delay) return;
    ctx.save();
    const segs = this.bolts[this.activeBolt];

    // Outer glow (wide, soft)
    ctx.globalAlpha = this.life * 0.4;
    ctx.shadowColor = '#88CCFF';
    ctx.shadowBlur = 30;
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(180,220,255,0.3)';
    ctx.beginPath();
    segs.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.stroke();

    // Mid glow
    ctx.globalAlpha = this.life * 0.7;
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 16;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#CCE8FF';
    ctx.beginPath();
    segs.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.stroke();

    // Core bolt — bright white
    ctx.globalAlpha = this.life;
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    segs.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.stroke();

    // Yellow center
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#FFD600';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    segs.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.stroke();

    // Branches
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = this.life * 0.7;
    ctx.strokeStyle = '#AAD8FF';
    ctx.shadowColor = '#88CCFF'; ctx.shadowBlur = 8;
    this.branches.forEach(b => {
      ctx.beginPath(); ctx.moveTo(b.x1,b.y1); ctx.lineTo(b.x2,b.y2); ctx.stroke();
      if (b.sub) {
        ctx.globalAlpha = this.life * 0.4;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(b.sub.x1,b.sub.y1); ctx.lineTo(b.sub.x2,b.sub.y2); ctx.stroke();
        ctx.globalAlpha = this.life * 0.7;
        ctx.lineWidth = 1.5;
      }
    });

    // Impact sparks at bottom
    ctx.shadowBlur = 6;
    this.sparks.forEach(s => {
      if (s.life <= 0) return;
      ctx.globalAlpha = s.life * this.life;
      ctx.fillStyle = s.life > 0.5 ? '#FFFFFF' : '#FFD600';
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.5*s.life, 0, Math.PI*2); ctx.fill();
    });

    ctx.restore();
  }
}

class MagnetAura {
  constructor(cx, cy) {
    this.cx = cx; this.cy = cy;
    this.life = 1; this.age = 0;
    this.duration = 3500;
    // Expanding rings
    this.rings = [];
    for (let i = 0; i < 4; i++) this.rings.push({ r: 10 + i*15, life: 1-i*0.2, speed: 1.5-i*0.2 });
    // Orbiting dots
    this.orbiters = Array.from({length: 8}, (_, i) => ({
      angle: (i/8)*Math.PI*2,
      speed: 0.04 + Math.random()*0.02,
      dist: 40 + Math.random()*25,
      size: 3 + Math.random()*3,
      life: 1,
    }));
    // Field particles (pulled inward)
    this.fieldParts = [];
    this.timer = 0;
  }
  get dead() { return this.life <= 0; }
  update(dtMs) {
    const dt = dtMs / 16.667;
    this.age += dtMs;
    this.life = Math.max(0, 1 - this.age / this.duration);
    this.timer += dtMs;

    // Pulse rings
    this.rings.forEach(r => {
      r.r += r.speed * dt;
      r.life -= 0.008 * dt;
      if (r.life < 0.05) { r.r = 5; r.life = 0.9; }
    });

    // Orbit
    this.orbiters.forEach(o => { o.angle += o.speed * dt; });

    // Spawn field particles from edges being pulled in
    if (this.timer > 80 && this.life > 0.1) {
      this.timer = 0;
      const angle = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 40;
      const px = this.cx + Math.cos(angle) * dist;
      const py = this.cy + Math.sin(angle) * dist;
      const speed = 2.5 + Math.random() * 2;
      this.fieldParts.push({
        x: px, y: py,
        vx: (this.cx - px) / dist * speed,
        vy: (this.cy - py) / dist * speed,
        life: 1, size: 2 + Math.random() * 3,
      });
    }
    this.fieldParts.forEach(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life = Math.max(0, p.life - 0.02 * dt);
      // Accelerate toward center
      const dx = this.cx - p.x, dy = this.cy - p.y;
      const d = Math.sqrt(dx*dx+dy*dy) || 1;
      p.vx += (dx/d)*0.2*dt; p.vy += (dy/d)*0.2*dt;
    });
    this.fieldParts = this.fieldParts.filter(p => p.life > 0 &&
      Math.hypot(p.x-this.cx, p.y-this.cy) > 6);
  }
  draw(ctx) {
    ctx.save();
    const a = this.life * 0.85;

    // Field line arcs (magnetic field lines)
    ctx.globalAlpha = a * 0.18;
    ctx.strokeStyle = '#B39DFF';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const ang = (i/6)*Math.PI*2;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, 55, ang, ang + Math.PI*0.35);
      ctx.stroke();
    }

    // Rings
    this.rings.forEach(r => {
      const alpha = a * r.life * 0.7;
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(this.cx, this.cy, r.r, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(149,117,255,${r.life})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#7C4DFF'; ctx.shadowBlur = 12;
      ctx.stroke();
    });

    // Orbiting dots
    this.orbiters.forEach((o, i) => {
      const ox = this.cx + Math.cos(o.angle) * o.dist;
      const oy = this.cy + Math.sin(o.angle) * o.dist;
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = i % 2 === 0 ? '#9C6FFF' : '#C8A8FF';
      ctx.shadowColor = '#7C4DFF'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(ox, oy, o.size, 0, Math.PI*2); ctx.fill();
    });

    // Field particles pulled in
    this.fieldParts.forEach(p => {
      ctx.globalAlpha = p.life * a;
      ctx.fillStyle = '#B39DFF';
      ctx.shadowColor = '#9C6FFF'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI*2); ctx.fill();
    });

    // Center pulse
    ctx.globalAlpha = a * 0.4;
    const pulse = 0.7 + 0.3 * Math.sin(this.age / 150);
    const grad = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, 28*pulse);
    grad.addColorStop(0, 'rgba(149,117,255,0.6)');
    grad.addColorStop(1, 'rgba(149,117,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, 28*pulse, 0, Math.PI*2); ctx.fill();

    ctx.restore();
  }
}

class BombExplosion {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.life = 1; this.age = 0;
    // Shockwave rings — multiple
    this.waves = [
      { r: 0, maxR: 120, life: 1, speed: 9 },
      { r: 0, maxR: 90,  life: 1, speed: 6, delay: 60 },
      { r: 0, maxR: 60,  life: 1, speed: 4, delay: 120 },
    ];
    // Explosion core flash
    this.flashLife = 1;
    // Debris particles — many more, varied
    this.particles = [];
    const COLORS = ['#FF4500','#FF6B35','#FF8C00','#FFD700','#FF3300','#FFAA00','#FFF0A0','#FF5500'];
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2 + (Math.random()-0.5)*0.3;
      const speed = 2 + Math.random() * 8;
      const color = COLORS[Math.floor(Math.random()*COLORS.length)];
      this.particles.push({
        x, y,
        vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed - 1,
        r: 2+Math.random()*5, life: 1,
        decay: 0.012+Math.random()*0.012,
        color, isShard: Math.random() < 0.3,
      });
    }
    // Smoke puffs
    this.smokes = Array.from({length: 8}, (_, i) => ({
      x, y, r: 8, maxR: 40 + Math.random()*30,
      vx: (Math.random()-0.5)*1.5, vy: -0.5-Math.random()*1.5,
      life: 1, decay: 0.008 + Math.random()*0.006,
      delay: i * 40,
    }));
  }
  get dead() { return this.age > 2500; }
  update(dtMs) {
    const dt = dtMs / 16.667;
    this.age += dtMs;
    this.flashLife = Math.max(0, this.flashLife - 0.1*dt);
    this.waves.forEach(w => {
      if (this.age < (w.delay||0)) return;
      w.r = Math.min(w.maxR, w.r + w.speed*dt);
      w.life = Math.max(0, 1 - w.r/w.maxR);
    });
    this.particles.forEach(p => {
      p.x+=p.vx*dt; p.y+=p.vy*dt;
      p.vy+=0.18*dt; p.vx*=0.96; p.vy*=0.98;
      p.life=Math.max(0,p.life-p.decay*dt);
    });
    this.smokes.forEach(s => {
      if (this.age < s.delay) return;
      s.x+=s.vx*dt; s.y+=s.vy*dt;
      s.r = Math.min(s.maxR, s.r + 0.8*dt);
      s.life=Math.max(0,s.life-s.decay*dt);
    });
  }
  draw(ctx) {
    ctx.save();

    // Core flash
    if (this.flashLife > 0) {
      ctx.globalAlpha = this.flashLife * 0.85;
      const g = ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,50*this.flashLife);
      g.addColorStop(0,'rgba(255,255,220,0.9)');
      g.addColorStop(0.3,'rgba(255,180,0,0.7)');
      g.addColorStop(1,'rgba(255,50,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(this.x,this.y,50*this.flashLife,0,Math.PI*2); ctx.fill();
    }

    // Shockwave rings
    this.waves.forEach(w => {
      if (!w.life) return;
      ctx.globalAlpha = w.life * 0.7;
      ctx.beginPath(); ctx.arc(this.x,this.y,w.r,0,Math.PI*2);
      ctx.strokeStyle = `rgba(255,${120+w.life*80},0,${w.life})`;
      ctx.lineWidth = 5 * w.life;
      ctx.shadowColor = '#FF4500'; ctx.shadowBlur = 18;
      ctx.stroke();
    });

    // Smoke puffs
    this.smokes.forEach(s => {
      if (s.life <= 0 || this.age < s.delay) return;
      ctx.globalAlpha = s.life * 0.2;
      ctx.fillStyle = `rgba(120,80,60,${s.life})`;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
    });

    // Debris
    this.particles.forEach(p => {
      if (p.life <= 0) return;
      ctx.globalAlpha = p.life;
      ctx.shadowColor = p.color; ctx.shadowBlur = p.life > 0.5 ? 8 : 3;
      ctx.fillStyle = p.color;
      if (p.isShard) {
        // Angular shard shape
        ctx.save(); ctx.translate(p.x,p.y);
        ctx.rotate(Math.atan2(p.vy,p.vx));
        ctx.beginPath(); ctx.moveTo(-p.r*p.life*2,0); ctx.lineTo(p.r*p.life,p.r*p.life*0.4);
        ctx.lineTo(p.r*p.life,-p.r*p.life*0.4); ctx.closePath(); ctx.fill(); ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2); ctx.fill();
      }
    });

    ctx.restore();
  }
}

class RainbowTrail {
  constructor(cx, cy) {
    this.cx = cx; this.cy = cy;
    this.life = 1; this.age = 0;
    this.duration = 1800;
    this.COLORS = ['#FF0000','#FF6600','#FFFF00','#00FF44','#00AAFF','#AA00FF','#FF00CC'];
    this.particles = [];
    this.spirals = [];
    this.rings = [];
    // Initial burst
    for (let i = 0; i < 60; i++) this._burst(cx, cy, i);
    // Spiral arms
    for (let arm = 0; arm < 7; arm++) {
      for (let j = 0; j < 12; j++) {
        const angle = (arm/7)*Math.PI*2 + j*0.3;
        const dist = j * 8;
        this.spirals.push({
          x: cx + Math.cos(angle)*dist,
          y: cy + Math.sin(angle)*dist,
          vx: Math.cos(angle)*(1+j*0.15),
          vy: Math.sin(angle)*(1+j*0.15) - 0.5,
          r: 3+Math.random()*4, life: 1,
          decay: 0.008+Math.random()*0.008,
          color: this.COLORS[arm % this.COLORS.length],
          delay: j * 20,
        });
      }
    }
    // Expanding rings
    for (let i = 0; i < 7; i++) {
      this.rings.push({ r: 0, maxR: 80+i*15, life: 1, color: this.COLORS[i], delay: i*60, speed: 3+i*0.5 });
    }
    this.timer = 0;
  }
  _burst(x, y, i) {
    const angle = (i/60)*Math.PI*2;
    const speed = 1 + Math.random()*5;
    this.particles.push({
      x, y,
      vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed - 0.5,
      r: 2+Math.random()*5, life: 1,
      decay: 0.01+Math.random()*0.01,
      color: this.COLORS[i % this.COLORS.length],
      isStar: Math.random() < 0.25,
    });
  }
  get dead() { return this.life <= 0; }
  update(dtMs) {
    const dt = dtMs / 16.667;
    this.age += dtMs; this.timer += dtMs;
    this.life = Math.max(0, 1 - this.age/this.duration);

    // Continuous particle stream
    if (this.timer > 35 && this.life > 0.1) {
      this.timer = 0;
      for (let i = 0; i < 3; i++) {
        const angle = Math.random()*Math.PI*2;
        const dist = Math.random()*20;
        this._burst(this.cx+Math.cos(angle)*dist, this.cy+Math.sin(angle)*dist, Math.floor(Math.random()*60));
      }
    }

    this.particles.forEach(p => {
      p.x+=p.vx*dt; p.y+=p.vy*dt;
      p.vy+=0.04*dt; p.vx*=0.98;
      p.life=Math.max(0,p.life-p.decay*dt);
    });
    this.particles = this.particles.filter(p=>p.life>0);

    this.spirals.forEach(s => {
      if (this.age < s.delay) return;
      s.x+=s.vx*dt; s.y+=s.vy*dt; s.vy+=0.03*dt;
      s.life=Math.max(0,s.life-s.decay*dt);
    });

    this.rings.forEach(r => {
      if (this.age < r.delay) return;
      r.r = Math.min(r.maxR, r.r + r.speed*dt);
      r.life = Math.max(0, 1 - r.r/r.maxR);
    });
  }
  draw(ctx) {
    ctx.save();

    // Rainbow rings
    this.rings.forEach(r => {
      if (!r.life) return;
      ctx.globalAlpha = r.life * this.life * 0.65;
      ctx.beginPath(); ctx.arc(this.cx,this.cy,r.r,0,Math.PI*2);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 * r.life;
      ctx.shadowColor = r.color; ctx.shadowBlur = 14;
      ctx.stroke();
    });

    // Spiral particles
    this.spirals.forEach(s => {
      if (s.life <= 0 || this.age < s.delay) return;
      ctx.globalAlpha = s.life * this.life;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r*s.life,0,Math.PI*2); ctx.fill();
    });

    // Main burst particles
    this.particles.forEach(p => {
      if (p.life <= 0) return;
      ctx.globalAlpha = p.life * this.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color; ctx.shadowBlur = p.isStar ? 14 : 7;
      if (p.isStar) {
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.life*5);
        ctx.beginPath();
        for(let i=0;i<5;i++){
          const a=(i/5)*Math.PI*2-Math.PI/2;
          const ia=a+Math.PI/5;
          if(i===0) ctx.moveTo(Math.cos(a)*p.r*p.life,Math.sin(a)*p.r*p.life);
          else ctx.lineTo(Math.cos(a)*p.r*p.life,Math.sin(a)*p.r*p.life);
          ctx.lineTo(Math.cos(ia)*p.r*p.life*0.45,Math.sin(ia)*p.r*p.life*0.45);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2); ctx.fill();
      }
    });

    // Center glow
    ctx.globalAlpha = this.life * 0.4;
    const g = ctx.createRadialGradient(this.cx,this.cy,0,this.cx,this.cy,30);
    this.COLORS.forEach((c,i) => g.addColorStop(i/6, c+'88'));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(this.cx,this.cy,30,0,Math.PI*2); ctx.fill();

    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// MAIN JUICE ENGINE CLASS
// ---------------------------------------------------------------------------

export class JuiceEngine {
  constructor() {
    this.shockwaves = [];
    this.bursts     = [];
    this.coinSparks = [];
    this.flashes    = [];
    this.comboTexts = [];
    this.lightningBolts = [];
    this.magnetAuras    = [];
    this.bombExplosions = [];
    this.rainbowTrails  = [];
    this._screenShakeCallback = null;
  }

  onScreenShake(cb) { this._screenShakeCallback = cb; }

  _shake(amt, ms) { this._screenShakeCallback?.(amt, ms); }

  // Called on every fruit drop
  onDrop(x, y) {
    soundDrop();
    // Tiny dust ring
    this.shockwaves.push(new ShockwaveRing(x, y, 'rgba(200,200,200,0.4)', 30));
  }

  // Called on every merge — tier is 0-based index of RESULT fruit
  onMerge(x, y, tier, color) {
    soundMerge(tier);

    const isHuge = tier >= 5;
    const isEpic = tier >= 3;

    // Particle starburst — bigger for higher tiers
    this.bursts.push(new StarBurst(x, y, color, tier));

    // Shockwave ring — always; extra ring for big merges
    this.shockwaves.push(new ShockwaveRing(x, y, color, 40 + tier * 15));
    if (isEpic) {
      this.shockwaves.push(new ShockwaveRing(x, y, '#fff', 25 + tier * 10));
    }

    // Screen flash for epic/huge merges
    if (isHuge) {
      this.flashes.push(new ScreenFlash(color, 0.6));
      this._shake(6 + tier * 2, 180);
    } else if (isEpic) {
      this.flashes.push(new ScreenFlash(color, 0.3));
      this._shake(3, 100);
    }

    // Coin sparks on big merges (feels like earning)
    if (isEpic) {
      const count = 3 + tier * 2;
      for (let i = 0; i < count; i++) this.coinSparks.push(new CoinSpark(x, y));
    }
  }

  // Called on combo — count is how many in the chain
  onCombo(x, y, count) {
    soundCombo(count);
    this.comboTexts.push(new ComboTextBurst(x, y - 30, count));

    if (count >= 3) {
      this.flashes.push(new ScreenFlash('#FFC857', 0.15 + Math.min(0.3, count * 0.025)));
    }
    if (count >= 5) {
      this._shake(3 + count * 0.5, 120);
      // Golden shockwave ring
      this.shockwaves.push(new ShockwaveRing(x, y, '#FFD700', 60 + count * 8));
    }
    if (count >= 10) {
      // Legendary — confetti explosion
      for (let i = 0; i < 12; i++) this.coinSparks.push(new CoinSpark(x + (Math.random()-0.5)*60, y + (Math.random()-0.5)*40));
      this.flashes.push(new ScreenFlash('#FF1744', 0.4));
    }
  }

  onLevelUp(x, y) {
    soundLevelUp();
    this.flashes.push(new ScreenFlash('#A8E6CF', 0.5));
    this._shake(4, 200);
    for (let i = 0; i < 20; i++) this.coinSparks.push(new CoinSpark(x + (Math.random()-0.5)*80, y - Math.random()*40));
    this.shockwaves.push(new ShockwaveRing(x, y, '#A8E6CF', 120));
    this.shockwaves.push(new ShockwaveRing(x, y, '#FFD700', 90));
  }

  onCoinEarned(x, y) {
    soundCoinCollect();
    for (let i = 0; i < 5; i++) this.coinSparks.push(new CoinSpark(x + (Math.random()-0.5)*20, y));
  }

  onDanger(progress) {
    soundDanger(progress);
  }

  onGameOver(x, y) {
    soundGameOver();
    this.flashes.push(new ScreenFlash('#FF1744', 0.8));
    this._shake(12, 400);
  }

  onUnlock(x, y) {
    soundUnlock();
    this.flashes.push(new ScreenFlash('#FFD700', 0.4));
    this.shockwaves.push(new ShockwaveRing(x, y, '#FFD700', 100));
    for (let i = 0; i < 10; i++) this.coinSparks.push(new CoinSpark(x + (Math.random()-0.5)*60, y));
  }

  onClick() { soundClick(); }

  // Power activation effects
  onPowerLightning(x1, y1, x2, y2) {
    soundPowerLightning();
    // 5 bolts with staggered delays — looks like real lightning chain
    for (let i = 0; i < 5; i++) {
      this.lightningBolts.push(new LightningBolt(
        x1 + (Math.random()-0.5)*25, y1,
        x2 + (Math.random()-0.5)*25, y2,
        i * 35
      ));
    }
    // Also shoot bolts to nearby positions
    for (let i = 0; i < 3; i++) {
      const tx = x2 + (Math.random()-0.5)*60;
      const ty = y2 + (Math.random()-0.5)*40;
      this.lightningBolts.push(new LightningBolt(x1, y1, tx, ty, i*50+80));
    }
    // White flash → yellow afterglow
    this.flashes.push(new ScreenFlash('#FFFFFF', 0.75));
    setTimeout(() => this.flashes.push(new ScreenFlash('#FFD600', 0.35)), 60);
    this._shake(16, 300);
  }

  onPowerMagnet(cx, cy) {
    soundPowerMagnet();
    this.magnetAuras.push(new MagnetAura(cx, cy));
    this.flashes.push(new ScreenFlash('#9C6FFF', 0.3));
    // Two pulses of shake — whirring feel
    this._shake(5, 120);
    setTimeout(() => this._shake(4, 100), 150);
    setTimeout(() => this._shake(3, 80), 280);
  }

  onPowerBomb(x, y) {
    soundPowerBomb();
    this.bombExplosions.push(new BombExplosion(x, y));
    // Massive white flash → orange
    this.flashes.push(new ScreenFlash('#FFFFFF', 0.9));
    setTimeout(() => this.flashes.push(new ScreenFlash('#FF6B00', 0.5)), 40);
    // Heavy shake — strongest
    this._shake(22, 450);
    // Aftershock
    setTimeout(() => this._shake(10, 200), 200);
    setTimeout(() => this._shake(5, 150), 400);
  }

  onPowerRainbow(cx, cy) {
    soundPowerRainbow();
    this.rainbowTrails.push(new RainbowTrail(cx, cy));
    // Cycling color flashes
    const colors = ['#FF0000','#FF7700','#FFFF00','#00FF00','#0099FF','#AA00FF','#FF00CC'];
    colors.forEach((c, i) => setTimeout(() => this.flashes.push(new ScreenFlash(c, 0.18)), i*45));
    this._shake(6, 180);
  }

  update(dtMs) {
    for (const s of this.shockwaves) s.update(dtMs);
    for (const b of this.bursts)     b.update(dtMs);
    for (const c of this.coinSparks) c.update(dtMs);
    for (const f of this.flashes)    f.update(dtMs);
    for (const t of this.comboTexts) t.update(dtMs);

    this.lightningBolts.forEach(l => l.update(dtMs));
    this.magnetAuras.forEach(m => m.update(dtMs));
    this.bombExplosions.forEach(b => b.update(dtMs));
    this.rainbowTrails.forEach(r => r.update(dtMs));
    this.shockwaves = this.shockwaves.filter(s => !s.dead);
    this.bursts     = this.bursts.filter(b => !b.dead);
    this.coinSparks = this.coinSparks.filter(c => !c.dead);
    this.flashes    = this.flashes.filter(f => !f.dead);
    this.comboTexts = this.comboTexts.filter(t => !t.dead);
    this.lightningBolts = this.lightningBolts.filter(l => !l.dead);
    this.magnetAuras    = this.magnetAuras.filter(m => !m.dead);
    this.bombExplosions = this.bombExplosions.filter(b => !b.dead);
    this.rainbowTrails  = this.rainbowTrails.filter(r => !r.dead);
  }

  // Draw UNDER fruits (shockwaves, floor flash)
  drawUnder(ctx, w, h) {
    for (const s of this.shockwaves) s.draw(ctx);
    for (const f of this.flashes)    f.draw(ctx, w, h);
  }

  // Draw OVER fruits (bursts, coins, combo text, powers)
  drawOver(ctx) {
    for (const b of this.bursts)      b.draw(ctx);
    for (const c of this.coinSparks)  c.draw(ctx);
    for (const t of this.comboTexts)  t.draw(ctx);
    for (const l of this.lightningBolts) l.draw(ctx);
    for (const m of this.magnetAuras)    m.draw(ctx);
    for (const b of this.bombExplosions) b.draw(ctx);
    for (const r of this.rainbowTrails)  r.draw(ctx);
  }
}
