// ---------------------------------------------------------------------------
// FEAR SYSTEM — Corruption, Darkness, Overflow Meters
// ---------------------------------------------------------------------------
// Creates tension. If a meter fills, the level fails.
// ---------------------------------------------------------------------------

const _listeners = [];

export const FEAR_TYPES = {
  OVERFLOW:   'overflow',
  CORRUPTION: 'corruption',
  DARKNESS:   'darkness',
};

let _state = {
  overflow: 0,    // 0-100: fills when fruits pile too high
  corruption: 0,  // 0-100: fills over time in chapter modifier
  darkness: 0,    // 0-100: special boss/event
  active: [],     // which meters are active this session
};

let _failListeners = [];

export function initFearSystem(activeMeters = ['overflow']) {
  _state.overflow = 0;
  _state.corruption = 0;
  _state.darkness = 0;
  _state.active = activeMeters;
  _notifyListeners();
}

export function setOverflow(pct) {
  if (!_state.active.includes('overflow')) return;
  _state.overflow = Math.min(100, Math.max(0, pct));
  _notifyListeners();
  if (_state.overflow >= 100) _triggerFail('overflow');
}

export function tickCorruption(deltaMs, ratePerSec = 2) {
  if (!_state.active.includes('corruption')) return;
  _state.corruption = Math.min(100, _state.corruption + (ratePerSec * deltaMs / 1000));
  _notifyListeners();
  if (_state.corruption >= 100) _triggerFail('corruption');
}

export function reduceCorruption(amount) {
  _state.corruption = Math.max(0, _state.corruption - amount);
  _notifyListeners();
}

export function setDarkness(pct) {
  if (!_state.active.includes('darkness')) return;
  _state.darkness = Math.min(100, Math.max(0, pct));
  _notifyListeners();
  if (_state.darkness >= 100) _triggerFail('darkness');
}

export function getFearState() {
  return { ..._state };
}

export function onFearChange(fn) {
  _listeners.push(fn);
}

export function onFearFail(fn) {
  _failListeners.push(fn);
}

function _notifyListeners() {
  for (const fn of _listeners) fn({ ..._state });
}

function _triggerFail(type) {
  for (const fn of _failListeners) fn(type);
}

// Calculate overflow from physics body positions
export function calcOverflowFromBodies(bodies, dangerY, boxHeight) {
  if (!bodies.length) return 0;
  const highestY = Math.min(...bodies.map(b => b.position.y));
  const dangerProgress = (dangerY - highestY) / dangerY;
  return Math.max(0, Math.min(100, dangerProgress * 100));
}
