// ---------------------------------------------------------------------------
// LIFE ENERGY SYSTEM — The primary resource of the Orchard
// ---------------------------------------------------------------------------
// Every merge generates Life Energy. Energy keeps the Orchard alive.
// Low energy = Orchard Health drops. No energy = Game Over.
// ---------------------------------------------------------------------------

const _listeners = [];
const _healthListeners = [];

let _state = {
  energy: 100,       // current Life Energy (0–999)
  maxEnergy: 200,    // cap
  orchardHealth: 100, // 0–100%
  drainRate: 1.5,    // health drain per second when energy is 0
  energyDecay: 0.8,  // energy decays slowly per second (orchard consumes it)
};

export function initLifeEnergy() {
  _state.energy = 100;
  _state.orchardHealth = 100;
  _notify();
  _notifyHealth();
}

export function getLifeEnergy() { return Math.floor(_state.energy); }
export function getOrchardHealth() { return Math.floor(_state.orchardHealth); }
export function getMaxEnergy() { return _state.maxEnergy; }

// Called on every merge — generates Life Energy
export function generateEnergy(tier, comboCount = 1) {
  const base = 5 + tier * 3;
  const comboBonus = comboCount >= 2 ? comboCount * 2 : 0;
  const gain = base + comboBonus;
  _state.energy = Math.min(_state.maxEnergy, _state.energy + gain);
  _notify();
  return gain;
}

// Spend energy for powers — returns false if not enough
export function spendEnergy(amount) {
  if (_state.energy < amount) return false;
  _state.energy = Math.max(0, _state.energy - amount);
  _notify();
  return true;
}

export function canAffordEnergy(amount) {
  return _state.energy >= amount;
}

// Called every frame — orchard consumes energy, health drops if starved
export function tickOrchard(deltaMs) {
  // Energy decays (orchard consumes it)
  const decay = (_state.energyDecay * deltaMs) / 1000;
  _state.energy = Math.max(0, _state.energy - decay);

  // If energy is empty, orchard health drops
  if (_state.energy <= 0) {
    _state.orchardHealth = Math.max(0, _state.orchardHealth - (_state.drainRate * deltaMs) / 1000);
    _notifyHealth();
    if (_state.orchardHealth <= 0) {
      _triggerOrchardDeath();
    }
  } else if (_state.energy > 20 && _state.orchardHealth < 100) {
    // Slowly recover health when energy is plentiful
    _state.orchardHealth = Math.min(100, _state.orchardHealth + (0.2 * deltaMs) / 1000);
    _notifyHealth();
  }

  _notify();
}

// Increase difficulty as chapters progress
export function setOrchardTier(chapterNum) {
  _state.energyDecay = 0.8 + chapterNum * 0.05;
  _state.drainRate = 1.5 + chapterNum * 0.1;
}

export function onEnergyChange(fn) { _listeners.push(fn); }
export function onOrchardHealthChange(fn) { _healthListeners.push(fn); }

const _deathListeners = [];
export function onOrchardDeath(fn) { _deathListeners.push(fn); }

function _notify() {
  for (const fn of _listeners) fn({ energy: _state.energy, max: _state.maxEnergy, health: _state.orchardHealth });
}
function _notifyHealth() {
  for (const fn of _healthListeners) fn(_state.orchardHealth);
}
function _triggerOrchardDeath() {
  for (const fn of _deathListeners) fn();
}
