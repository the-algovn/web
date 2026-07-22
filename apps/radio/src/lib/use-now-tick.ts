import { useEffect, useState } from "react"

// One interval for a whole list of relative timestamps. Rows receive the
// value as a prop — a hook per row would mean a timer per row.
export function useNowTick(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
