// Wire types for algovn.race.v1, plus the normalization every response goes
// through.
//
// The gateway transcodes with proto3 JSON defaults, which OMITS zero-valued
// scalars entirely. In practice that means the opening commentary line arrives
// with no `atMs`, the first tick with no `tMs`, and a race won by duck 0 with no
// `winnerIndex`. Reading those straight off the wire yields undefined and then
// NaN in the playback maths, so nothing may touch a raw response — go through
// normalizeRace / normalizeSummary and work in the normalized types below.

export type RaceStatus =
  | "RACE_STATUS_UNSPECIFIED"
  | "RACE_STATUS_AWAITING_NONCE"
  | "RACE_STATUS_PREPARING"
  | "RACE_STATUS_READY"
  | "RACE_STATUS_FAILED"

export type EventKind =
  | "EVENT_KIND_UNSPECIFIED"
  | "EVENT_KIND_START"
  | "EVENT_KIND_OVERTAKE"
  | "EVENT_KIND_LEAD_CHANGE"
  | "EVENT_KIND_PHOTO_FINISH"
  | "EVENT_KIND_FINISH"

export interface Room {
  id: string
  code: string
  title: string
  createdAtMs: number
}

export interface Tick {
  tMs: number
  positions: number[]
}

export interface Line {
  atMs: number
  text: string
  intensity: number
  audioUrl: string
}

export interface Fairness {
  seedCommit: string
  serverSeed: string
  clientNonce: string
  seed: string
}

export interface RacePackage {
  raceId: string
  roomId: string
  duckNames: string[]
  durationMs: number
  ticks: Tick[]
  events: { tMs: number; kind: EventKind; duckIndexes: number[] }[]
  finishOrder: number[]
  lines: Line[]
  /** Spoken before the gun. Its own clock, from 0 — never negative race times. */
  introLines: Line[]
  drama: string
  fairness: Fairness
}

export interface RaceSummary {
  raceId: string
  status: RaceStatus
  duckNames: string[]
  winnerIndex: number
  createdAtMs: number
}

export interface WinTally {
  duckName: string
  wins: number
}

// Raw shapes: every scalar optional, because the gateway drops zeros.
type RawTick = { tMs?: number; positions?: number[] }
type RawLine = {
  atMs?: number
  text?: string
  intensity?: number
  audioUrl?: string
}
type RawEvent = { tMs?: number; kind?: EventKind; duckIndexes?: number[] }

export type RawRoom = {
  id?: string
  code?: string
  title?: string
  createdAtMs?: string | number
}

export type RawRacePackage = {
  raceId?: string
  roomId?: string
  duckNames?: string[]
  durationMs?: number
  ticks?: RawTick[]
  events?: RawEvent[]
  finishOrder?: number[]
  lines?: RawLine[]
  introLines?: RawLine[]
  drama?: string
  fairness?: Partial<Fairness>
}

export type RawRaceSummary = {
  raceId?: string
  status?: RaceStatus
  duckNames?: string[]
  winnerIndex?: number
  createdAtMs?: string | number
}

const num = (v: number | undefined): number => v ?? 0

// int64 crosses protojson as a decimal STRING, and is dropped when zero.
const int64 = (v: string | number | undefined): number => Number(v ?? 0)

const lineOf = (l: RawLine): Line => ({
  atMs: num(l.atMs),
  text: l.text ?? "",
  intensity: num(l.intensity),
  audioUrl: l.audioUrl ?? "",
})

export function normalizeRoom(raw: RawRoom | undefined): Room {
  return {
    id: raw?.id ?? "",
    code: raw?.code ?? "",
    title: raw?.title ?? "",
    createdAtMs: int64(raw?.createdAtMs),
  }
}

export function normalizeRace(raw: RawRacePackage): RacePackage {
  return {
    raceId: raw.raceId ?? "",
    roomId: raw.roomId ?? "",
    duckNames: raw.duckNames ?? [],
    durationMs: num(raw.durationMs),
    ticks: (raw.ticks ?? []).map((t) => ({
      tMs: num(t.tMs),
      positions: t.positions ?? [],
    })),
    events: (raw.events ?? []).map((e) => ({
      tMs: num(e.tMs),
      kind: e.kind ?? "EVENT_KIND_UNSPECIFIED",
      duckIndexes: e.duckIndexes ?? [],
    })),
    finishOrder: raw.finishOrder ?? [],
    lines: (raw.lines ?? []).map(lineOf),
    introLines: (raw.introLines ?? []).map(lineOf),
    drama: raw.drama ?? "",
    fairness: {
      seedCommit: raw.fairness?.seedCommit ?? "",
      serverSeed: raw.fairness?.serverSeed ?? "",
      clientNonce: raw.fairness?.clientNonce ?? "",
      seed: raw.fairness?.seed ?? "",
    },
  }
}

export function normalizeSummary(raw: RawRaceSummary): RaceSummary {
  return {
    raceId: raw.raceId ?? "",
    status: raw.status ?? "RACE_STATUS_UNSPECIFIED",
    duckNames: raw.duckNames ?? [],
    winnerIndex: num(raw.winnerIndex),
    createdAtMs: int64(raw.createdAtMs),
  }
}
