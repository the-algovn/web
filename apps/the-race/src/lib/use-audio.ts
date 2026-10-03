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
 *
 * Chrome auto-suspends idle AudioContexts and blocks resume() outside a user
 * gesture. A silent oscillator keeps the context alive from the first click
 * until the component unmounts - it never stops between races, so replay,
 * rematch, and shared-link viewer all share the same protection.
 */
export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const playbackRef = useRef<Playback | null>(null)
  const keepAliveRef = useRef<OscillatorNode | null>(null)

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

      // Keep the context alive across async prepare phases and between races.
      // A silent oscillator is audible to Chrome's autoplay policy, which only
      // checks that the graph is "producing sound" - it can't tell it's at
      // zero gain. Without this the context is suspended after ~30s of
      // silence and resume() is blocked outside a user gesture.
      const osc = ctx.createOscillator()
      const keepAliveGain = ctx.createGain()
      keepAliveGain.gain.value = 0
      osc.connect(keepAliveGain)
      keepAliveGain.connect(ctx.destination)
      osc.start()
      keepAliveRef.current = osc
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

  /**
   * Tear the whole broadcast down, decoded tracks and all.
   *
   * `stop` silences what is playing but leaves `loaded` in place, which is
   * right for a replay of the same race — it is the same commentary, restarted.
   * It is wrong for a different race: the next package would be played with the
   * previous one's clips and captions. Anything switching races calls this.
   */
  const reset = useCallback(() => {
    stop()
    setLoaded(null)
  }, [stop])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      // Muting is a gain change, never a pause: pausing would desync the race.
      if (gainRef.current) gainRef.current.gain.value = next ? 0 : 1
      return next
    })
  }, [])

  useEffect(
    () => () => {
      playbackRef.current?.stop()
      if (keepAliveRef.current) {
        try { keepAliveRef.current.stop() } catch { /* already stopped */ }
      }
    },
    [],
  )

  return { arm, armed, load, loaded, start, stop, reset, muted, toggleMute }
}
