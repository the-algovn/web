import { useCallback, useEffect, useRef, useState } from "react"
import { type Playback, type Preloaded, play, preload } from "./audio"
import type { RacePackage } from "./types"

/**
 * The audio side of the race.
 *
 * The AudioContext is created on a user tap and never on our own initiative:
 * iOS refuses to start one otherwise, and a context created in an effect after
 * a poll completes is far outside the gesture that would have authorised it.
 * `arm` is what the tap calls; everything else waits for it.
 */
export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const playbackRef = useRef<Playback | null>(null)

  const [armed, setArmed] = useState(false)
  const [loaded, setLoaded] = useState<Preloaded | null>(null)
  const [muted, setMuted] = useState(false)

  /** Call from a click handler. Safe to call more than once. */
  const arm = useCallback(() => {
    if (!ctxRef.current) {
      const Ctor = window.AudioContext ?? window.webkitAudioContext
      // No Web Audio at all is a silent race, not a broken one.
      if (!Ctor) {
        setArmed(true)
        return
      }
      const ctx = new Ctor()
      const gain = ctx.createGain()
      gain.connect(ctx.destination)
      ctxRef.current = ctx
      gainRef.current = gain
    }
    // Safari hands back a suspended context even from inside the gesture.
    void ctxRef.current?.resume().catch(() => {})
    setArmed(true)
  }, [])

  /** Decode both tracks. Resolves to silent schedules if audio is unavailable. */
  const load = useCallback(async (race: RacePackage) => {
    const ctx = ctxRef.current
    const result = ctx
      ? await preload(ctx, race)
      : await preload(
          { currentTime: 0, decodeAudioData: () => Promise.reject() },
          race,
        )
    setLoaded(result)
    return result
  }, [])

  /** Start the broadcast and return the clock origin the visuals read from. */
  const start = useCallback((ready: Preloaded, raceOffsetMs: number) => {
    const ctx = ctxRef.current
    const gain = gainRef.current
    if (!ctx || !gain) return null
    playbackRef.current = play(ctx, ready, raceOffsetMs, gain)
    return { ctx, startedAt: playbackRef.current.startedAt }
  }, [])

  const stop = useCallback(() => {
    playbackRef.current?.stop()
    playbackRef.current = null
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      // Muting is a gain change, never a pause: pausing would desync the race.
      if (gainRef.current) gainRef.current.gain.value = next ? 0 : 1
      return next
    })
  }, [])

  useEffect(() => () => playbackRef.current?.stop(), [])

  return { arm, armed, load, loaded, start, stop, muted, toggleMute }
}
