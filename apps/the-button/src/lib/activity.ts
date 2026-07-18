// The live feed is derived purely from the real global counter: each positive
// jump between frames becomes one "+Δ clicks" row. No usernames are invented —
// the feed shows only true aggregate movement.
export interface FeedItem {
  id: number
  amount: number
}

export interface FeedState {
  items: FeedItem[]
  lastTotal: number | null
  nextId: number
}

export const MAX_FEED = 6

export function emptyFeed(): FeedState {
  return { items: [], lastTotal: null, nextId: 0 }
}

export function pushTotal(state: FeedState, total: number): FeedState {
  if (state.lastTotal === null) return { ...state, lastTotal: total }
  const delta = total - state.lastTotal
  if (delta <= 0) return state
  const item: FeedItem = { id: state.nextId, amount: delta }
  return {
    items: [item, ...state.items].slice(0, MAX_FEED),
    lastTotal: total,
    nextId: state.nextId + 1,
  }
}
