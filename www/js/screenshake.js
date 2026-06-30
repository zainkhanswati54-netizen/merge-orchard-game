// A decaying random-jitter screen shake. trigger() can be called repeatedly —
// the strongest active shake always wins, so a big merge happening right
// after a small drop won't get muted by the smaller shake's decay.
export class ScreenShake {
  constructor() {
    this.duration = 0;
    this.elapsed = 0;
    this.intensity = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  trigger(intensity, durationMs = 220) {
    if (intensity >= this.intensity || this.elapsed >= this.duration) {
      this.intensity = intensity;
      this.duration = durationMs;
      this.elapsed = 0;
    }
  }

  update(dtMs) {
    if (this.elapsed >= this.duration) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }
    this.elapsed += dtMs;
    const remaining = clamp01(1 - this.elapsed / this.duration);
    const power = this.intensity * remaining;
    this.offsetX = (Math.random() * 2 - 1) * power;
    this.offsetY = (Math.random() * 2 - 1) * power;
  }

  get offset() {
    return { x: this.offsetX, y: this.offsetY };
  }
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
