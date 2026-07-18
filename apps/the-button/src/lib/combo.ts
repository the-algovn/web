// Cosmetic combo: rapid pressing builds "heat" that decays continuously. Heat
// drives only visual juice and the cosmetic XP bonus rate — never the real
// click count. The clock is injected so behaviour is deterministic in tests.

const HEAT_PER_PRESS = 14
const DECAY_PER_MS = 6 / 250 // ~6 heat lost per 250ms idle tick
const MAX_HEAT = 100
const COMBO_XP_SCALE = 5

export interface ComboState {
  heat: number
  multiplier: number
  label: string
}

export interface Combo {
  press(nowMs: number): ComboState
  tick(nowMs: number): ComboState
  state(): ComboState
}

export function multiplierForHeat(heat: number): number {
  const clamped = Math.max(0, Math.min(MAX_HEAT, heat))
  return 1 + (clamped / MAX_HEAT) * 4
}

export function labelForHeat(heat: number): string {
  if (heat <= 0) return "idle"
  const m = multiplierForHeat(heat)
  if (m >= 4) return "on fire"
  if (m >= 2.5) return "heating"
  return "warming"
}

export function comboXpBonus(multiplier: number): number {
  return Math.max(0, Math.round((multiplier - 1) * COMBO_XP_SCALE))
}

export function createCombo(opts: { heatPerPress?: number; decayPerMs?: number } = {}): Combo {
  const heatPerPress = opts.heatPerPress ?? HEAT_PER_PRESS
  const decayPerMs = opts.decayPerMs ?? DECAY_PER_MS
  let heat = 0
  let lastMs = 0
  let started = false

  function decayTo(now: number): void {
    if (!started) {
      started = true
      lastMs = now
      return
    }
    const dt = now - lastMs
    if (dt > 0) {
      heat = Math.max(0, heat - decayPerMs * dt)
      lastMs = now
    }
  }

  function snapshot(): ComboState {
    return { heat, multiplier: multiplierForHeat(heat), label: labelForHeat(heat) }
  }

  return {
    press(now) {
      decayTo(now)
      heat = Math.min(MAX_HEAT, heat + heatPerPress)
      return snapshot()
    },
    tick(now) {
      decayTo(now)
      return snapshot()
    },
    state() {
      return snapshot()
    },
  }
}
