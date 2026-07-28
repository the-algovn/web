// The six RaceService routes, behind the gateway prefix /the-race.
//
// Every response goes through the normalizers in ./types — the gateway omits
// zero-valued scalars, so nothing here hands a raw body to the UI.

import { type ApiClient, createApiClient } from "@algovn/api"
import {
  normalizeRace,
  normalizeRoom,
  normalizeSummary,
  type RacePackage,
  type RaceStatus,
  type RaceSummary,
  type RawRacePackage,
  type RawRoom,
  type RawRaceSummary,
  type Room,
  type WinTally,
} from "./types"

export interface PreparingRace {
  status: RaceStatus
  /** simulating | commentating | voicing — empty once ready. */
  prepareStage: string
  error: string
  /** Present only when status is RACE_STATUS_READY. */
  race: RacePackage | null
}

export interface RoomHistory {
  races: RaceSummary[]
  tally: WinTally[]
}

export interface RaceClient {
  createRoom(title: string, token: string): Promise<Room>
  getRoom(code: string): Promise<Room>
  createRace(
    roomId: string,
    duckNames: string[],
    token: string,
  ): Promise<{ raceId: string; seedCommit: string }>
  startRace(raceId: string, nonce: string, token: string): Promise<void>
  getRace(raceId: string): Promise<PreparingRace>
  listRoomRaces(roomId: string): Promise<RoomHistory>
}

export function createRaceClient(opts: {
  apiBase: string
  request?: ApiClient["request"]
}): RaceClient {
  const request =
    opts.request ?? createApiClient({ baseUrl: opts.apiBase }).request

  return {
    async createRoom(title, token) {
      const res = await request<{ room?: RawRoom }>(
        "POST",
        "/rooms",
        { title },
        token,
      )
      return normalizeRoom(res.room)
    },

    async getRoom(code) {
      const res = await request<{ room?: RawRoom }>("POST", "/rooms/get", {
        code,
      })
      return normalizeRoom(res.room)
    },

    async createRace(roomId, duckNames, token) {
      const res = await request<{ raceId?: string; seedCommit?: string }>(
        "POST",
        "/races",
        { roomId, duckNames },
        token,
      )
      return { raceId: res.raceId ?? "", seedCommit: res.seedCommit ?? "" }
    },

    async startRace(raceId, nonce, token) {
      await request("POST", "/races/start", { raceId, clientNonce: nonce }, token)
    },

    async getRace(raceId) {
      const res = await request<{
        status?: RaceStatus
        prepareStage?: string
        error?: string
        race?: RawRacePackage
      }>("POST", "/races/get", { raceId })
      return {
        status: res.status ?? "RACE_STATUS_UNSPECIFIED",
        prepareStage: res.prepareStage ?? "",
        error: res.error ?? "",
        race: res.race ? normalizeRace(res.race) : null,
      }
    },

    async listRoomRaces(roomId) {
      const res = await request<{
        races?: RawRaceSummary[]
        tally?: { duckName?: string; wins?: number }[]
      }>("POST", "/rooms/races", { roomId })
      return {
        races: (res.races ?? []).map(normalizeSummary),
        tally: (res.tally ?? []).map((t) => ({
          duckName: t.duckName ?? "",
          wins: t.wins ?? 0,
        })),
      }
    },
  }
}
