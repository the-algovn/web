import { useEffect, useState } from "react"

const TAGLINES = [
  "stress-testing a home server",
  "proving humans can work together",
  "because the internet needs more joy",
  "every click is a tiny rebellion",
]

const ROTATE_MS = 6_000

export function Taglines() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setIndex(i => (i + 1) % TAGLINES.length), ROTATE_MS)
    return () => clearInterval(timer)
  }, [])
  return <p className="text-muted-foreground text-sm sm:text-base">{TAGLINES[index]}</p>
}
