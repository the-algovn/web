import type { RadioClient } from "./radio-client"

const KEY = "radio:session"

export function sessionId(
  store: Pick<Storage, "getItem" | "setItem"> = sessionStorage,
  uuid: () => string = () => crypto.randomUUID(),
): string {
  const existing = store.getItem(KEY)
  if (existing) return existing
  const id = uuid()
  store.setItem(KEY, id)
  return id
}

export function startHeartbeat(
  client: Pick<RadioClient, "heartbeat">,
  opts: { intervalMs?: number; sessionId?: string } = {},
): () => void {
  const id = opts.sessionId ?? sessionId()
  const ping = () => void client.heartbeat(id).catch(() => {})
  ping()
  const timer = setInterval(ping, opts.intervalMs ?? 30_000)
  return () => clearInterval(timer)
}
