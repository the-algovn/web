import { useCallback, useRef, useState } from "react"

export interface Particle {
  id: number
  x: number
  y: number
}

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
    setParticles(prev => [...prev, { id, x, y }])
  }, [])
  const remove = useCallback((id: number) => {
    setParticles(prev => prev.filter(p => p.id !== id))
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
      {particles.map(p => (
        <span
          key={p.id}
          onAnimationEnd={() => onDone(p.id)}
          style={{ left: p.x, top: p.y }}
          className="the-button-particle text-primary absolute font-mono text-3xl font-bold"
        >
          +
        </span>
      ))}
    </div>
  )
}
