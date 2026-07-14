"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { runCommand, type CommandCtx, type Session } from "./commands"
import { complete } from "./completion"
import { createFilesystem } from "./filesystem"

export type TermLine = { kind: "input" | "output"; text: string }

const MAX_BUFFER = 200
const STAGGER_MS = 70
const GLITCH_MS = 1600

export function useTerminal() {
  const [active, setActive] = useState(false)
  const [lines, setLines] = useState<TermLine[]>([])
  const [buffer, setBuffer] = useState("")
  const [matrixOn, setMatrixOn] = useState(false)
  const [busy, setBusy] = useState(false)

  const fsRef = useRef(createFilesystem())
  const sessionRef = useRef<Session>({ planSeen: false, unknownHinted: false })
  const historyRef = useRef<string[]>([])
  const histIdxRef = useRef(0)
  const crtRef = useRef(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const { resolvedTheme, setTheme } = useTheme()
  const themeRef = useRef(resolvedTheme)
  useEffect(() => {
    themeRef.current = resolvedTheme
  })

  // live mirrors so the single global listener never reads stale state
  const activeRef = useRef(active)
  const bufferRef = useRef(buffer)
  const busyRef = useRef(busy)
  const matrixRef = useRef(matrixOn)
  useEffect(() => {
    activeRef.current = active
    bufferRef.current = buffer
    busyRef.current = busy
    matrixRef.current = matrixOn
  })

  const reset = useCallback(() => {
    setLines([])
    setBuffer("")
    setActive(false)
    setBusy(false)
    histIdxRef.current = historyRef.current.length
  }, [])

  const submit = useCallback(
    async (raw: string) => {
      setLines((prev) => [...prev, { kind: "input", text: raw }])
      if (raw.trim()) historyRef.current.push(raw)
      histIdxRef.current = historyRef.current.length
      setBuffer("")
      setBusy(true)
      const ctx: CommandCtx = {
        fs: fsRef.current,
        session: sessionRef.current,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        fetchText: async (url) => {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`${res.status}`)
          return res.text()
        },
        setTheme: (target) => {
          const next =
            target === "toggle" ? (themeRef.current === "dark" ? "light" : "dark") : target
          setTheme(next)
          return next
        },
        toggleCrt: () => {
          crtRef.current = !crtRef.current
          document.documentElement.classList.toggle("crt", crtRef.current)
          return crtRef.current
        },
        startMatrix: () => setMatrixOn(true),
        triggerGlitch: () => {
          document.documentElement.classList.add("glitching")
          window.setTimeout(
            () => document.documentElement.classList.remove("glitching"),
            GLITCH_MS,
          )
        },
      }
      const result = await runCommand(raw, ctx)
      if (result.clear) {
        reset()
        return
      }
      const out: TermLine[] = result.lines.map((text) => ({ kind: "output", text }))
      if (result.stagger) {
        for (const line of out) {
          setLines((prev) => [...prev, line])
          await new Promise((r) => setTimeout(r, STAGGER_MS))
        }
      } else {
        setLines((prev) => [...prev, ...out])
      }
      setBusy(false)
    },
    [reset, setTheme],
  )

  const applyHistory = useCallback((dir: -1 | 1) => {
    const h = historyRef.current
    if (h.length === 0) return
    const next = Math.min(h.length, Math.max(0, histIdxRef.current + dir))
    histIdxRef.current = next
    setBuffer(next === h.length ? "" : h[next])
  }, [])

  const applyCompletion = useCallback(() => {
    const done = complete(bufferRef.current, fsRef.current, sessionRef.current)
    if (done) setBuffer(done.slice(0, MAX_BUFFER))
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return

      if (matrixRef.current) {
        e.preventDefault()
        setMatrixOn(false)
        return
      }

      // ctrl+c cancels the line — but never steal a real copy
      if (e.ctrlKey && !e.metaKey && !e.altKey && e.key === "c") {
        if (window.getSelection()?.toString()) return
        if (!activeRef.current) return
        e.preventDefault()
        setLines((prev) => [...prev, { kind: "input", text: `${bufferRef.current}^C` }])
        setBuffer("")
        return
      }
      if (e.ctrlKey && !e.metaKey && !e.altKey && e.key === "l") {
        if (!activeRef.current) return
        e.preventDefault()
        reset()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (busyRef.current) return

      if (e.key === "Enter") {
        if (activeRef.current) {
          e.preventDefault()
          void submit(bufferRef.current)
        }
        return
      }
      if (e.key === "Backspace") {
        if (activeRef.current) {
          e.preventDefault()
          setBuffer((b) => b.slice(0, -1))
        }
        return
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (activeRef.current) {
          e.preventDefault()
          applyHistory(e.key === "ArrowUp" ? -1 : 1)
        }
        return
      }
      if (e.key === "Tab") {
        if (bufferRef.current) {
          e.preventDefault()
          applyCompletion()
        }
        return
      }
      if (e.key.length === 1) {
        // space never starts a session and scrolls as usual on an empty buffer
        if (e.key === " " && !bufferRef.current) return
        e.preventDefault()
        if (!activeRef.current) setActive(true)
        setBuffer((b) => (b + e.key).slice(0, MAX_BUFFER))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [applyCompletion, applyHistory, reset, submit])

  const hiddenInputProps = {
    ref: inputRef,
    value: buffer,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value.slice(0, MAX_BUFFER)
      setBuffer(v)
      if (v && !activeRef.current) setActive(true)
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (busyRef.current) return
      if (e.key === "Enter") {
        e.preventDefault()
        void submit(bufferRef.current)
      } else if (e.key === "Tab") {
        if (bufferRef.current) {
          e.preventDefault()
          applyCompletion()
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        applyHistory(-1)
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        applyHistory(1)
      }
    },
  }

  const focusCursor = useCallback(() => inputRef.current?.focus({ preventScroll: true }), [])
  const stopMatrix = useCallback(() => setMatrixOn(false), [])

  return { active, lines, buffer, busy, matrixOn, focusCursor, stopMatrix, hiddenInputProps }
}
