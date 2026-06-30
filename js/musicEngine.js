// ===========================================================================
// MUSIC ENGINE v4 — Single "Orchard Adventure" theme
// Fun, catchy, game-feel music that builds with gameplay
// BPM: 138 base → 158 at full danger (was 118-144, now faster & more exciting)
// ===========================================================================

let _ac = null, _masterGain = null, _compressor = null;
let _isPlaying = false, _volume = 0.38, _energy = 0.2;
let _timerID = null, _beatCount = 0, _nextBeatTime = 0;
let _nodes = [];

// ── Music theory ──────────────────────────────────────────────────────────
// G major pentatonic — bright, happy, adventure feel
const MELODY_NOTES = [55,57,59,62,64,67,69,71,74,76]; // MIDI
// I–V–vi–IV chord roots (G D Em C) — most satisfying loop in music
const CHORD_ROOTS  = [43,50,52,48];
// Bass walks
const BASS_ROOTS   = [31,38,40,36]; // G2 D2 E2 C2

const m2f = n => 440 * Math.pow(2, (n-69)/12);

function getBPM() { return 138 + _energy * 20; } // 138 → 158

function ac() {
  if (!_ac) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    _ac = new C();
    window.__audioCtxRef = _ac; // expose for app lifecycle management
    // Compressor for loudness & polish
    _compressor = _ac.createDynamicsCompressor();
    _compressor.threshold.value = -18;
    _compressor.knee.value = 8;
    _compressor.ratio.value = 4;
    _compressor.attack.value = 0.003;
    _compressor.release.value = 0.15;
    _masterGain = _ac.createGain();
    _masterGain.gain.value = _volume;
    _masterGain.connect(_compressor);
    _compressor.connect(_ac.destination);
  }
  if (_ac.state === 'suspended') _ac.resume().catch(()=>{});
  return _ac;
}

// ── Synthesis primitives ──────────────────────────────────────────────────

function osc(freq, t, dur, gain, type='sine', freqEnd=null) {
  const ctx = ac(); if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1,freqEnd), t+dur*0.8);
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(gain, t+0.006);
  g.gain.setValueAtTime(gain * 0.7, t + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.001, t+dur);
  o.connect(g).connect(_masterGain);
  o.start(t); o.stop(t+dur+0.05);
  _nodes.push(o);
}

function nz(t, dur, gain, ftype='lowpass', ffreq=200, q=1) {
  const ctx = ac(); if (!ctx) return;
  const len = Math.ceil(ctx.sampleRate * Math.min(dur, 0.5));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 1.5);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type=ftype; f.frequency.value=ffreq; f.Q.value=q;
  const g = ctx.createGain(); g.gain.setValueAtTime(gain,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  s.connect(f).connect(g).connect(_masterGain);
  s.start(t); _nodes.push(s);
}

// ── Drums ─────────────────────────────────────────────────────────────────

function kick(t, vel=1) {
  osc(m2f(36), t, 0.22, 0.25*vel, 'sine', m2f(28));
  nz(t, 0.04, 0.12*vel, 'lowpass', 100, 1);
}

function snare(t, vel=1) {
  osc(m2f(62), t, 0.06, 0.06*vel, 'triangle');
  nz(t, 0.11, 0.10*vel, 'highpass', 1200, 0.8);
}

function clap(t, vel=1) {
  [0,0.006,0.012].forEach(d => nz(t+d, 0.07, 0.07*vel, 'bandpass', 1800, 1.5));
}

function hat(t, open=false, vel=1) {
  nz(t, open?0.16:0.035, (open?0.05:0.04)*vel, 'highpass', 7500, 0.7);
}

function rimshot(t, vel=1) {
  osc(m2f(75), t, 0.04, 0.05*vel, 'square');
  nz(t, 0.03, 0.04*vel, 'bandpass', 2500, 2);
}

// ── Instruments ───────────────────────────────────────────────────────────

function bassNote(midi, t, dur, vel=1) {
  osc(m2f(midi), t, dur, (0.16+_energy*0.08)*vel, 'sine');
  if (_energy > 0.4) osc(m2f(midi), t, dur*0.4, 0.04*vel, 'sawtooth');
}

function pad(root, t, dur) {
  // Warm chord pad — root + major 3rd + 5th
  [0,4,7].forEach((iv,i) => osc(m2f(root+12+iv), t+i*0.018, dur, 0.022+_energy*0.015, 'sine'));
}

function melodyNote(midi, t, dur, vel=1) {
  osc(m2f(midi), t, dur, (0.07+_energy*0.07)*vel, 'triangle');
  // Slight harmonic
  osc(m2f(midi+12), t, dur*0.5, 0.025*vel, 'sine');
}

function arpNote(midi, t) {
  const b = 60/getBPM()/4;
  osc(m2f(midi), t, b*0.8, 0.04+_energy*0.025, 'triangle');
}

function pluck(midi, t) {
  // Punchy pluck for groove
  osc(m2f(midi), t, 0.12, 0.06, 'sawtooth', m2f(midi)*0.5);
}

// ── Main beat scheduler ───────────────────────────────────────────────────

function scheduleBeat(t, idx) {
  const bpm  = getBPM();
  const b    = 60 / bpm;   // beat duration
  const s8   = b / 2;       // 8th note
  const s16  = b / 4;       // 16th note
  const bar  = Math.floor(idx / 4);
  const beat = idx % 4;
  const e    = _energy;

  const chordRoot = CHORD_ROOTS[bar % CHORD_ROOTS.length];
  const bassRoot  = BASS_ROOTS [bar % BASS_ROOTS.length];

  // ── DRUMS ─────────────────────────────────────────────────────────────

  // Kick: 4-on-the-floor (always), double kick at high energy
  kick(t, 0.9 + e*0.2);
  if (e > 0.55 && beat === 2) kick(t + s16*2, 0.7);

  // Snare: beats 1 & 3
  if (beat===1 || beat===3) {
    snare(t, 0.8 + e*0.25);
    if (e > 0.5) clap(t, 0.6);
  }

  // Rimshot: upbeat groove
  if (e > 0.3 && beat === 0) rimshot(t + s8, 0.6);

  // Hi-hats: 8th notes always, 16ths at high energy
  hat(t, false, 0.7+e*0.2);
  hat(t + s8, beat===1 && e>0.45, 0.6+e*0.15);
  if (e > 0.6) {
    hat(t + s16,   false, 0.4);
    hat(t + s16*3, false, 0.4);
  }
  // Open hat on beat 2 upbeat
  if (e > 0.5 && beat === 2) hat(t + s8, true, 0.45);

  // ── BASS ──────────────────────────────────────────────────────────────

  // Root on beat 0, 5th on beat 2
  if (beat === 0) bassNote(bassRoot, t, b*1.8);
  if (e > 0.35 && beat === 2) bassNote(bassRoot + 7, t, b*0.9);
  // Bass walk-up fill on beat 4
  if (e > 0.6 && beat === 3) {
    bassNote(bassRoot+5, t+s16*2, s16, 0.8);
    bassNote(bassRoot+7, t+s16*3, s16, 0.8);
  }
  // Syncopated bass hit
  if (e > 0.7 && beat === 1) bassNote(bassRoot, t+s16, s16*2, 0.6);

  // ── PAD ───────────────────────────────────────────────────────────────
  if (beat === 0 && e > 0.2) pad(chordRoot, t, b*3.8);

  // ── MELODY ────────────────────────────────────────────────────────────
  if (e > 0.18) {
    const phrase  = Math.floor(bar / 2); // 8-bar phrase
    const noteIdx = ((bar*3 + beat*2 + phrase*7) % MELODY_NOTES.length);
    const note    = MELODY_NOTES[noteIdx];

    if (beat===0 || beat===2) {
      melodyNote(note, t, b*1.6);
    }
    // Answering phrase on off-beats
    if (e > 0.45 && beat===1) {
      const ans = MELODY_NOTES[(noteIdx+2) % MELODY_NOTES.length];
      melodyNote(ans, t+s8, s8*1.4, 0.75);
    }
    // High counter melody
    if (e > 0.72 && beat===3) {
      const hi = MELODY_NOTES[(noteIdx+4) % MELODY_NOTES.length];
      osc(m2f(hi+12), t, b*0.7, 0.035, 'sine');
    }
  }

  // ── ARPEGGIO (energy > 0.5) ───────────────────────────────────────────
  if (e > 0.50 && beat===0) {
    [0,4,7,12,16].forEach((iv,i) => arpNote(chordRoot+24+iv, t + i*s16*0.9));
  }
  if (e > 0.75 && beat===2) {
    [0,7,12,16].forEach((iv,i) => arpNote(chordRoot+7+24+iv, t + i*s16*0.85));
  }

  // ── GROOVE PLUCKS (energy > 0.6) ─────────────────────────────────────
  if (e > 0.60) {
    if (beat===1) pluck(chordRoot+12, t+s16);
    if (beat===3) pluck(chordRoot+12+4, t+s16*2);
  }

  // ── TRANSITION FILL (every 8 bars, beat 3) ───────────────────────────
  if (bar % 8 === 7 && beat === 3 && e > 0.4) {
    [s16, s16*2, s16*3].forEach((off,i) => {
      kick(t+off, 0.7);
      nz(t+off, 0.06, 0.06, 'highpass', 3000, 1);
    });
  }
}

function _tick() {
  const ctx = ac(); if (!ctx) return;
  const now = ctx.currentTime;
  while (_nextBeatTime < now + 0.25) {
    scheduleBeat(_nextBeatTime, _beatCount++);
    _nextBeatTime += 60 / getBPM();
  }
  _timerID = setTimeout(_tick, 60);
}

// ── Public API ────────────────────────────────────────────────────────────

export function startMusicEngine(vol = 0.38) {
  const ctx = ac(); if (!ctx || _isPlaying) return;
  _volume = vol;
  _masterGain.gain.value = vol;
  _nextBeatTime = ctx.currentTime + 0.12;
  _beatCount = 0; _isPlaying = true;
  _tick();
}

export function stopMusicEngine() {
  if (_timerID) clearTimeout(_timerID);
  _timerID = null; _isPlaying = false;
  const ctx = ac(); if (!ctx) return;
  _masterGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime+0.4);
  setTimeout(() => {
    _nodes.forEach(n => { try{n.stop();}catch(e){} });
    _nodes = [];
    if (_masterGain) _masterGain.gain.value = _volume;
  }, 450);
}

export function setMusicVolume(vol) {
  _volume = Math.max(0, Math.min(1, vol));
  const ctx = ac(); if (!ctx) return;
  _masterGain.gain.linearRampToValueAtTime(_volume, ctx.currentTime+0.1);
}

export function setMusicEnergy(level) {
  _energy = Math.max(0, Math.min(1, level));
}

// Stub for settings compatibility
export function setMusicTrack(t) {}
export function getMusicTrack() { return 'orchard'; }
export function getAvailableTracks() {
  return [{ id:'orchard', name:'🌿 Orchard Adventure', desc:'The one and only' }];
}
export function isMusicPlaying() { return _isPlaying; }
