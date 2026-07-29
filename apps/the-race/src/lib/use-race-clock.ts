import { useEffect, useRef, useState } from "react"

/**
 * The single clock the whole broadcast is drawn from — intro, countdown and race
 * are stretches of it, not separate timers. One timebase means the ducks, the
 * captions and the spoken commentary can never disagree; when audio is playing
 * this becomes the AudioContext clock and everything keeps reading from the same
 * place.
 *
 * Returns elapsed milliseconds, clamped to totalMs.
 */
export interface AudioClock {
  ctx: { readonly currentTime: number }
  startedAt: number
}

export function useRaceClock(
  totalMs: number,
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
    if (!running || totalMs <= 0) return

    // Rewind here, at the start of the broadcast — not when it stops. Resetting
    // on stop rewinds the stage the instant the result appears, so the winner's
    // panel sits above ducks back at the start line.
    setTMs(0)

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
      if (elapsed >= totalMs) {
        setTMs(totalMs)
        onEndRef.current?.()
        return
      }
      setTMs(elapsed)
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)

    return () => cancelAnimationFrame(frame)
  }, [running, totalMs])

  return tMs
}
