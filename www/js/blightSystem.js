// ---------------------------------------------------------------------------
// BLIGHT SYSTEM — The dark corruption consuming the Orchard
// ---------------------------------------------------------------------------
// Blight grows constantly. Bad merges, idle time, wasted powers = more Blight.
// Reach 100% = "The orchard has fallen." — Game Over.
// ---------------------------------------------------------------------------

const _listeners = [];
const _failListeners = [];

let _state = {
  blight: 0,         // 0–100
  growthRate: 1.2,   // % per second base growth
  active: false,
  lastIdleTime: 0,
  idleThresholdMs: 4000, // idle for 4s = extra blight
};

export function initBlight(startActive = false, chapterNum = 1) {
  _state.blight = 0;
  _state.active = startActive;
  // Blight grows faster in later chapters
  _state.growthRate = 1.0 + chapterNum * 0.08;
  _state.lastIdleTime = performance.now();
  _notify();
}

export function getBlightLevel() { return Math.min(100, Math.floor(_state.blight)); }
export function isBlightActive() { return _state.active; }

// Called every frame
export function tickBlight(deltaMs) {
  if (!_state.active) return;

  // Base constant growth
  _state.blight += (_state.growthRate * deltaMs) / 1000;

  // Idle penalty
  const now = performance.now();
  if (now - _state.lastIdleTime > _state.idleThresholdMs) {
    _state.blight += (0.5 * deltaMs) / 1000;
  }

  _state.blight = Math.min(100, _state.blight);
  _notify();

  if (_state.blight >= 100) {
    _triggerFail();
  }
}

// Good merge — reduces Blight a little
export function blightOnGoodMerge(tier, comboCount = 1) {
  if (!_state.active) return;
  const reduction = 0.5 + tier * 0.2 + (comboCount >= 3 ? 1 : 0);
  _state.blight = Math.max(0, _state.blight - reduction);
  _state.lastIdleTime = performance.now(); // reset idle
  _notify();
}

// Bad merge / wasted power increases Blight
export function blightPenalty(amount = 2) {
  if (!_state.active) return;
  _state.blight = Math.min(100, _state.blight + amount);
  _notify();
}

// Player dropped a fruit — reset idle timer
export function blightOnDrop() {
  _state.lastIdleTime = performance.now();
}

// Power wasted (used at wrong time) — penalty
export function blightOnWastedPower() {
  blightPenalty(5);
}

// Blight reduced by Guardian ability or shrine restore
export function reduceBlight(amount) {
  _state.blight = Math.max(0, _state.blight - amount);
  _notify();
}

export function onBlightChange(fn) { _listeners.push(fn); }
export function onBlightFail(fn) { _failListeners.push(fn); }

function _notify() {
  for (const fn of _listeners) fn(_state.blight);
}

function _triggerFail() {
  for (const fn of _failListeners) fn();
}
