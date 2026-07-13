"use client"

import { useEffect, useState } from "react"
import { Battery, SignalHigh, Wifi } from "lucide-react"

export function StatusBar() {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false }))
    update()
    const id = setInterval(update, 10_000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="flex items-center justify-between px-8 pt-4 pb-2 text-sm font-semibold text-white/90">
      <span className="tabular-nums">{time ?? " "}</span>
      <span className="flex items-center gap-1.5">
        <SignalHigh className="size-4" aria-hidden />
        <Wifi className="size-4" aria-hidden />
        <Battery className="size-5" aria-hidden />
      </span>
    </header>
  )
}
