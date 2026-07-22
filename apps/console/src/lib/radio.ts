// Wire types for algovn.radio.v1 over the gateway. protojson: camelCase,
// int64 as decimal strings, zero-valued fields omitted — every field is
// optional; rely on tracks[] order, not position; coerce int64s with Number().
// Durations here are int32, so plain numbers.

export interface Station {
  onAir?: boolean
  onAirSince?: string
  aiEnabled?: boolean
}

export interface StationStats {
  listeners?: number
  libraryCount?: number
  spendTodayUsd?: number
  budgetUsd?: number
}

export interface StationResponse {
  station?: Station
  stats?: StationStats
}

export interface TrackRequest {
  id?: string
  source?: string
  requestedByName?: string
  ytId?: string
  title?: string
  channel?: string
  durationS?: number
  thumbnailUrl?: string
  status?: string
  failReason?: string
  createdAt?: string
  reason?: string
}

export interface StationRequestsResponse {
  pending?: TrackRequest[]
  recent?: TrackRequest[]
}

export interface NowPlayingWire {
  kind?: string
  title?: string
  artist?: string
  thumbnailUrl?: string
  startedAt?: string
  durationSeconds?: number
  listeners?: number
  source?: string
  requestedByName?: string
  reason?: string
}

export interface HistoryWireItem {
  title?: string
  artist?: string
  airedAt?: string
  source?: string
  requestedByName?: string
}
