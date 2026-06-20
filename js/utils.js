export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(randRange(min, max + 1));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Overshoots past 1 then settles — perfect for a satisfying "pop" scale-in.
export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

// Drives the merge "pop": scales up from 0 -> 1.2, then settles to 1.0.
// t goes from 0 (just spawned) to 1 (fully settled).
export function popScale(t) {
  const clamped = clamp(t, 0, 1);
  if (clamped < 0.55) {
    return easeOutQuad(clamped / 0.55) * 1.2;
  }
  const t2 = (clamped - 0.55) / 0.45;
  return lerp(1.2, 1.0, easeOutQuad(t2));
}

// Adds a brief non-uniform "squish" on top of popScale — the fruit looks
// momentarily squashed wide-and-short right as it spawns (like landing
// dough), then springs back to a normal round pop. This is what makes a
// merge feel juicy/soft rather than just "appearing."
export function squishPopScale(t) {
  const base = popScale(t);
  const squishWindow = 0.45; // squish fully fades out by this point in the tween
  const squishAmount = clamp(1 - t / squishWindow, 0, 1) * easeOutQuad(1 - t / squishWindow);
  const widen = 0.22 * squishAmount;
  return {
    scaleX: base * (1 + widen),
    scaleY: base * (1 - widen),
  };
}

// Drives the "landing" squash — unlike squishPopScale, the fruit is already
// full size (it's not spawning), it just deforms briefly on impact and
// springs back, with a tiny elastic overshoot (a slight *stretch* the
// opposite way) right before settling, which is what reads as "bouncy
// physics" rather than a flat thud.
export function landingSquashScale(t) {
  const eased = easeOutBack(clamp(t, 0, 1));
  const squashAmount = clamp(1 - eased, -0.3, 1);
  const widen = 0.16 * squashAmount;
  return {
    scaleX: 1 + widen,
    scaleY: 1 - widen,
  };
}
