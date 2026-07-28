import { useEffect, useRef } from "react"
import { positionsAt, standingsLabel } from "../lib/timeline"
import type { RacePackage } from "../lib/types"

const LANE_H = 46
const PAD_X = 14

/**
 * The water. A dumb painter: it holds no state, decides nothing, and reads every
 * position from the authored timeline at the current clock. All of the logic it
 * depends on lives in lib/timeline.ts under test — canvas is untestable in
 * jsdom, so nothing that matters is allowed in here.
 *
 * The canvas is decorative. Standings are published as an aria-label and the
 * commentary is real text, so the race is followable without it.
 */
export function Stage({
  race,
  tMs,
  reducedMotion,
}: {
  race: RacePackage
  tMs: number
  reducedMotion: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const positions = positionsAt(race.ticks, tMs)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = race.duckNames.length * LANE_H
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.height = `${h}px`
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const trackW = w - PAD_X * 2 - 30

    race.duckNames.forEach((_, duck) => {
      const y = duck * LANE_H + LANE_H / 2
      const p = positions[duck] ?? 0

      // lane water
      ctx.fillStyle = duck % 2 === 0 ? "#0e2a33" : "#0c242c"
      ctx.fillRect(0, duck * LANE_H, w, LANE_H)

      // wake behind the duck
      const x = PAD_X + trackW * Math.min(p, 1)
      if (!reducedMotion) {
        const grad = ctx.createLinearGradient(PAD_X, 0, x, 0)
        grad.addColorStop(0, "rgba(120, 220, 255, 0)")
        grad.addColorStop(1, "rgba(120, 220, 255, 0.35)")
        ctx.strokeStyle = grad
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(PAD_X, y)
        ctx.lineTo(x, y)
        ctx.stroke()
      }

      // the duck itself; a gentle bob unless motion is unwelcome
      const bob = reducedMotion ? 0 : Math.sin(tMs / 220 + duck) * 2.5
      ctx.font = "22px system-ui, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("🦆", x, y + bob)
    })

    // finish line
    const finishX = PAD_X + trackW
    ctx.strokeStyle = "rgba(255,255,255,0.55)"
    ctx.setLineDash([6, 6])
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(finishX, 0)
    ctx.lineTo(finishX, h)
    ctx.stroke()
    ctx.setLineDash([])
  }, [race, tMs, positions, reducedMotion])

  return (
    <div className="relative">
      <canvas
        ref={ref}
        role="img"
        aria-label={standingsLabel(positions, race.duckNames)}
        className="w-full rounded-lg"
        style={{ height: race.duckNames.length * LANE_H }}
      />
      <ol className="pointer-events-none absolute inset-0 m-0 list-none p-0">
        {race.duckNames.map((name, duck) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: a lane IS its index — duck order is fixed for the life of a race and names may legitimately repeat, so the index is the stable identity here, not a positional stand-in
            key={duck}
            className="flex items-center pl-3 font-medium text-white/85 text-xs"
            style={{ height: LANE_H }}
          >
            <span className="rounded bg-black/45 px-1.5 py-0.5">{name}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
