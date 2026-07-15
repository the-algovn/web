// impact is the caller's share of all clicks, as a percentage.
export function impact(myTotal: number | null, total: number | null): number | null {
  if (myTotal === null || total === null || total <= 0) return null
  return (myTotal / total) * 100
}

// avgClicksPerSession is total clicks divided by distinct contributors.
export function avgClicksPerSession(total: number | null, users: number | null): number | null {
  if (total === null || users === null || users <= 0) return null
  return total / users
}
