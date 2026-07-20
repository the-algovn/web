import { useCallback, useRef, useState } from "react"

export interface Particle {
  id: number
  x: number
  y: number
}

const PARTICLE_SHADES = [
  "#00ff88",
  "#00cc6a",
  "#00994d",
  "#00663a",
  "#00331a",
] as const

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

export function useParticles() {
  const [particles, setParticles] = useState<Particle[]>([])
  const nextId = useRef(0)
  const emit = useCallback((x: number, y: number) => {
    if (prefersReducedMotion()) return
    const id = nextId.current++
    setParticles((prev) => [...prev, { id, x, y }])
  }, [])
  const remove = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id))
  }, [])
  return { particles, emit, remove }
}

export function ParticleLayer({
  particles,
  onDone,
}: {
  particles: Particle[]
  onDone: (id: number) => void
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          onAnimationEnd={() => onDone(p.id)}
          style={{
            left: p.x,
            top: p.y,
            color: PARTICLE_SHADES[p.id % PARTICLE_SHADES.length],
          }}
          className="the-button-particle absolute font-mono text-4xl font-bold"
        >
          +
        </span>
      ))}
    </div>
  )
}
