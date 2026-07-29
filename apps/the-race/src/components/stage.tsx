import { useEffect, useRef } from "react"
import { cameraScaleAt } from "../lib/broadcast"
import { duckColor, ranksAt } from "../lib/ducks"
import { positionsAt, standings, standingsLabel } from "../lib/timeline"
import type { RacePackage } from "../lib/types"

const LANE_H = 46
const PAD_X = 14

/**
 * The water. A dumb painter: it holds no state, decides nothing, and reads every
 * position from the authored timeline at the current clock. All of the logic it
 * depends on — the camera, the colours, the ranks — lives under lib/ and under
 * test; canvas is untestable in jsdom, so nothing that matters is allowed in
 * here.
 *
 * The canvas is decorative. Standings are published as an aria-label and the
 * commentary is real text, so the race is followable without it.
 */
export function Stage({
  race,
  tMs,
  reducedMotion,
  atGate = false,
}: {
  race: RacePackage
  tMs: number
  reducedMotion: boolean
  /**
   * Before the gun. No lane is the leader's and no duck has a rank yet, so the
   * stage shows a field waiting rather than a standing nobody has earned.
   */
  atGate?: boolean
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

    const scale = cameraScaleAt(race.drama, tMs, race.durationMs)
    const finishX = PAD_X + trackW
    // Horizontal only, anchored on the finish line: the gap that matters gets
    // wider while every lane stays in frame, however many ducks there are.
    ctx.translate(finishX, 0)
    ctx.scale(scale, 1)
    ctx.translate(-finishX, 0)

    const leader = standings(positions)[0]

    race.duckNames.forEach((_, duck) => {
      const y = duck * LANE_H + LANE_H / 2
      const p = positions[duck] ?? 0
      const color = duckColor(duck)

      // The lane carries "leader"; the duck keeps its own colour, because the
      // colour is what tells you who it is.
      ctx.fillStyle =
        duck === leader && !atGate
          ? "rgba(0, 224, 122, 0.10)"
          : duck % 2 === 0
            ? "#131b24"
            : "#111820"
      ctx.fillRect(0, duck * LANE_H, w, LANE_H)

      const x = PAD_X + trackW * Math.min(p, 1)
      if (!reducedMotion) {
        const grad = ctx.createLinearGradient(PAD_X, 0, x, 0)
        grad.addColorStop(0, `${color}00`)
        grad.addColorStop(1, `${color}66`)
        ctx.strokeStyle = grad
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(PAD_X, y)
        ctx.lineTo(x, y)
        ctx.stroke()
      }

      const bob = reducedMotion ? 0 : Math.sin(tMs / 220 + duck) * 2.5
      // A colour disc behind the glyph: the emoji cannot be tinted, so identity
      // rides underneath it.
      ctx.beginPath()
      ctx.fillStyle = color
      ctx.arc(x, y + bob, 13, 0, Math.PI * 2)
      ctx.fill()

      // Ink, before the glyph: a colour-emoji font ignores fillStyle, but where
      // the duck falls back to a monochrome glyph it would otherwise be drawn in
      // the disc's own colour and vanish into it.
      ctx.fillStyle = "#0a0d12"
      ctx.font = "20px system-ui, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("🦆", x, y + bob)
    })

    // finish line
    ctx.strokeStyle = "rgba(255,255,255,0.55)"
    ctx.setLineDash([6, 6])
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(finishX, 0)
    ctx.lineTo(finishX, h)
    ctx.stroke()
    ctx.setLineDash([])
  }, [race, tMs, positions, reducedMotion, atGate])

  const ranks = ranksAt(positions)

  return (
    <div className="relative">
      <canvas
        ref={ref}
        role="img"
        // Before the gun there is no order to announce. standingsLabel would read
        // lane order out as though it were a standing, telling anyone not looking
        // at the canvas the opposite of the "–" the lane labels show.
        aria-label={
          atGate
            ? "Các vịt đang chờ ở vạch xuất phát"
            : standingsLabel(positions, race.duckNames)
        }
        className="w-full rounded-lg"
        style={{ height: race.duckNames.length * LANE_H }}
      />
      <ol className="pointer-events-none absolute inset-0 m-0 list-none p-0">
        {race.duckNames.map((name, duck) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: a lane IS its index — duck order is fixed for the life of a race and names may legitimately repeat, so the index is the stable identity here, not a positional stand-in
            key={duck}
            className="flex items-center gap-1.5 pl-2.5 font-medium text-xs"
            style={{ height: LANE_H }}
          >
            <span
              className="w-4 text-center font-bold tabular-nums"
              style={{ color: duckColor(duck) }}
            >
              {atGate ? "–" : ranks[duck]}
            </span>
            <span className="rounded bg-black/55 px-1.5 py-0.5 text-white/90">
              {name}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
