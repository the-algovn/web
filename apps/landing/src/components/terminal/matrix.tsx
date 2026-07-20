"use client"

import { useEffect, useRef } from "react"

const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789"
const FONT_SIZE = 16
const FRAME_MS = 50

export function MatrixRain({ onDismiss }: { onDismiss: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const color =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim() || "#00ff88"
    let columns: number[] = []
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      columns = new Array(Math.ceil(canvas.width / FONT_SIZE)).fill(0)
      ctx.fillStyle = "#0c0c0c"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener("resize", resize)
    let raf = 0
    let last = 0
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (now - last < FRAME_MS) return
      last = now
      ctx.fillStyle = "rgba(12, 12, 12, 0.08)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = color
      ctx.font = `${FONT_SIZE}px monospace`
      columns.forEach((y, i) => {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        ctx.fillText(glyph, i * FONT_SIZE, y * FONT_SIZE)
        columns[i] =
          y * FONT_SIZE > canvas.height && Math.random() > 0.975 ? 0 : y + 1
      })
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      onClick={onDismiss}
      className="fixed inset-0 z-50"
    />
  )
}
