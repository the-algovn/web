import { useEffect, useRef, useState } from "react"

/**
 * The single clock the race is drawn from. One timebase means the ducks and the
 * captions can never disagree; when spoken commentary lands, this becomes the
 * AudioContext clock and everything keeps reading from the same place.
 *
 * Returns elapsed milliseconds, clamped to durationMs.
 */
export function useRaceClock(
  durationMs: number,
  running: boolean,
  onEnd?: () => void,
): number {
  const [tMs, setTMs] = useState(0)
  // Held in a ref so a changing callback never restarts the animation loop.
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  useEffect(() => {
    if (!running || durationMs <= 0) return

    let frame = 0
    const origin = performance.now()

    const step = () => {
      const elapsed = performance.now() - origin
      if (elapsed >= durationMs) {
        setTMs(durationMs)
        onEndRef.current?.()
        return
      }
      setTMs(elapsed)
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)

    return () => cancelAnimationFrame(frame)
  }, [running, durationMs])

  // Rewind whenever the race stops, so replay starts from the gun.
  useEffect(() => {
    if (!running) setTMs(0)
  }, [running])

  return tMs
}
