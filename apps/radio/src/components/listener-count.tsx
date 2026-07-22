import { Users } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export function ListenerCount({ count }: { count: number }) {
  const [bumped, setBumped] = useState(false)
  const previous = useRef(count)

  useEffect(() => {
    if (previous.current === count) return
    previous.current = count
    setBumped(true)
    const timer = setTimeout(() => setBumped(false), 600)
    return () => clearTimeout(timer)
  }, [count])

  return (
    <span
      // role="img" (not "status"): the count changes on every join/leave, and
      // a live region here would announce each tick — the project reserves
      // aria-live for the now-playing title only. role="img" just gives the
      // icon+number span an accessible name.
      role="img"
      aria-label={`${count} người đang nghe`}
      className={`inline-flex items-center gap-1.5 font-mono text-xs transition-colors duration-300 ${
        bumped ? "radio-bump" : "text-[color:var(--muted-foreground)]"
      }`}
    >
      <Users aria-hidden className="size-3.5" />
      {count}
    </span>
  )
}
