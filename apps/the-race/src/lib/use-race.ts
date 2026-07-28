import { ApiError } from "@algovn/api"
import { useCallback, useEffect, useRef, useState } from "react"
import { newNonce } from "./nonce"
import type { PreparingRace, RaceClient, RoomHistory } from "./race-client"
import type { RacePackage, Room } from "./types"

export type Phase = "lobby" | "preparing" | "racing" | "result"

/** How often the preparing screen asks whether the package is ready. */
export const POLL_MS = 750

export interface RaceState {
  phase: Phase
  room: Room | null
  seedCommit: string
  prepareStage: string
  race: RacePackage | null
  history: RoomHistory | null
  error: string
}

const initial: RaceState = {
  phase: "lobby",
  room: null,
  seedCommit: "",
  prepareStage: "",
  race: null,
  history: null,
  error: "",
}

const message = (e: unknown): string =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Có lỗi xảy ra"

export function useRace(client: RaceClient, getToken: () => Promise<string>) {
  const [state, setState] = useState<RaceState>(initial)
  const patch = useCallback(
    (p: Partial<RaceState>) => setState((s) => ({ ...s, ...p })),
    [],
  )

  // The race currently being polled. A ref, not state, so the poll effect is
  // driven by one value rather than restarting on every unrelated change.
  const [pendingId, setPendingId] = useState("")
  const duckNamesRef = useRef<string[]>([])

  /** Sign in, make the room, seal a race, hand over our nonce. */
  const start = useCallback(
    async (title: string, duckNames: string[], room?: Room) => {
      try {
        patch({ error: "", prepareStage: "" })
        const token = await getToken()

        const theRoom = room ?? (await client.createRoom(title, token))
        duckNamesRef.current = duckNames

        // Two calls on purpose: the commit is published before we reveal the
        // nonce, which is what stops the server picking a favourite.
        const { raceId, seedCommit } = await client.createRace(
          theRoom.id,
          duckNames,
          token,
        )
        await client.startRace(raceId, newNonce(), token)

        patch({
          phase: "preparing",
          room: theRoom,
          seedCommit,
          race: null,
          prepareStage: "simulating",
        })
        setPendingId(raceId)
      } catch (e) {
        patch({ phase: "lobby", error: message(e) })
      }
    },
    [client, getToken, patch],
  )

  /** Rematch: same ducks, same room, a brand new seed and commit. */
  const rematch = useCallback(() => {
    const room = state.room
    if (!room) return
    void start(room.title, duckNamesRef.current, room)
  }, [start, state.room])

  /** Open a race someone shared with us. Never needs a token. */
  const watch = useCallback(
    async (raceId: string) => {
      try {
        patch({ error: "", phase: "preparing", prepareStage: "" })
        setPendingId(raceId)
      } catch (e) {
        patch({ phase: "lobby", error: message(e) })
      }
    },
    [patch],
  )

  const replay = useCallback(() => patch({ phase: "racing" }), [patch])
  const finish = useCallback(() => patch({ phase: "result" }), [patch])
  const backToLobby = useCallback(() => setState(initial), [])

  // Poll until the package is sealed, then run it.
  useEffect(() => {
    if (!pendingId) return
    let alive = true
    let timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      let got: PreparingRace
      try {
        got = await client.getRace(pendingId)
      } catch (e) {
        if (alive) patch({ phase: "lobby", error: message(e) })
        return
      }
      if (!alive) return

      if (got.status === "RACE_STATUS_READY" && got.race) {
        duckNamesRef.current = got.race.duckNames
        patch({ phase: "racing", race: got.race, prepareStage: "" })
        setPendingId("")
        return
      }
      if (got.status === "RACE_STATUS_FAILED") {
        patch({ phase: "lobby", error: got.error || "Không dựng được cuộc đua" })
        setPendingId("")
        return
      }
      patch({ prepareStage: got.prepareStage })
      timer = setTimeout(tick, POLL_MS)
    }

    void tick()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [pendingId, client, patch])

  // Refresh the room's history whenever a race lands.
  useEffect(() => {
    const roomId = state.room?.id
    if (!roomId || state.phase !== "result") return
    let alive = true
    void client
      .listRoomRaces(roomId)
      .then((h) => alive && patch({ history: h }))
      .catch(() => {
        // History is a nicety; a failure here must not disturb the result.
      })
    return () => {
      alive = false
    }
  }, [state.phase, state.room?.id, client, patch])

  return { state, start, watch, replay, rematch, finish, backToLobby }
}
