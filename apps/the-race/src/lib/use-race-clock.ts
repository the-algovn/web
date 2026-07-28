import { useEffect, useRef, useState } from "react"

/**
 * The single clock the race is drawn from. One timebase means the ducks and the
 * captions can never disagree; when spoken commentary lands, this becomes the
 * AudioContext clock and everything keeps reading from the same place.
 *
 * Returns elapsed milliseconds, clamped to durationMs.
 */
export interface AudioClock {
  ctx: { readonly currentTime: number }
  startedAt: number
}

export function useRaceClock(
  durationMs: number,
  running: boolean,
  onEnd?: () => void,
  audio?: AudioClock | null,
): number {
  const [tMs, setTMs] = useState(0)
  // Held in a ref so a changing callback never restarts the animation loop.
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd
  const audioRef = useRef(audio)
  audioRef.current = audio

  useEffect(() => {
    if (!running || durationMs <= 0) return

    let frame = 0
    const origin = performance.now()

    // When the commentary is playing, the audio clock IS the race clock —
    // reading elapsed time from anywhere else is how picture and sound drift
    // apart. Without audio there is nothing to sync to, so rAF's own clock is
    // both correct and sufficient.
    const elapsedMs = () => {
      const a = audioRef.current
      if (a) return (a.ctx.currentTime - a.startedAt) * 1000
      return performance.now() - origin
    }

    const step = () => {
      const elapsed = elapsedMs()
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
