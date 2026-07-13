"use client"

import { useEffect, useRef } from "react"
import { Mesh, Program, Renderer, Triangle } from "ogl"
import { AURORA_FRAGMENT, AURORA_VERTEX } from "./aurora-shader"

export function AuroraBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const createRenderer = () => {
      try {
        return new Renderer({
          dpr: Math.min(window.devicePixelRatio, 2),
          alpha: false,
          antialias: false,
        })
      } catch {
        return null
      }
    }
    const renderer = createRenderer()
    if (!renderer || !renderer.gl) return
    const gl = renderer.gl

    const canvas = gl.canvas as HTMLCanvasElement
    canvas.style.display = "block"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.opacity = "0"
    canvas.style.transition = "opacity 1s ease"
    container.appendChild(canvas)

    const program = new Program(gl, {
      vertex: AURORA_VERTEX,
      fragment: AURORA_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
        uPointer: { value: [0.5, 0.5] },
        uPointerStrength: { value: 0 },
      },
    })
    if (!gl.getProgramParameter(program.program, gl.LINK_STATUS)) {
      gl.getExtension("WEBGL_lose_context")?.loseContext()
      canvas.remove()
      return
    }
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })

    const pointerTarget = { x: 0.5, y: 0.5 }
    const pointer = { x: 0.5, y: 0.5 }
    let strengthTarget = 0
    let strength = 0
    let idleTimer: number | undefined

    const onPointerMove = (e: PointerEvent) => {
      pointerTarget.x = e.clientX / window.innerWidth
      pointerTarget.y = 1 - e.clientY / window.innerHeight
      strengthTarget = 1
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => {
        strengthTarget = 0
      }, 1200)
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true })

    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight)
      program.uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight]
    }
    resize()
    window.addEventListener("resize", resize)

    let raf = 0
    let timeSec = 0
    let last = performance.now()
    let firstFrame = true

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      timeSec += (now - last) / 1000
      last = now
      pointer.x += (pointerTarget.x - pointer.x) * 0.05
      pointer.y += (pointerTarget.y - pointer.y) * 0.05
      strength += (strengthTarget - strength) * (strengthTarget > strength ? 0.08 : 0.02)
      program.uniforms.uTime.value = timeSec
      program.uniforms.uPointer.value = [pointer.x, pointer.y]
      program.uniforms.uPointerStrength.value = strength
      renderer.render({ scene: mesh })
      if (firstFrame) {
        firstFrame = false
        canvas.style.opacity = "1"
      }
    }
    raf = requestAnimationFrame(frame)

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
      } else {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)

    const onContextLost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
      canvas.style.opacity = "0"
    }
    canvas.addEventListener("webglcontextlost", onContextLost)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(idleTimer)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("resize", resize)
      document.removeEventListener("visibilitychange", onVisibility)
      canvas.removeEventListener("webglcontextlost", onContextLost)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
      canvas.remove()
    }
  }, [])

  return <div ref={containerRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />
}
