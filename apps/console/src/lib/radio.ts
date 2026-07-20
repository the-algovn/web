// Wire types for algovn.radio.v1 over the gateway. protojson: camelCase,
// int64 as decimal strings, zero-valued fields omitted — every field is
// optional; rely on tracks[] order, not position; coerce int64s with Number().

export interface PlaylistSummary {
  id?: string
  name?: string
  trackCount?: number
  totalDurationS?: string | number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface PlaylistTrack {
  position?: number
  ytId?: string
  title?: string
  channel?: string
  durationS?: string | number
}

export interface Playlist {
  summary?: PlaylistSummary
  tracks?: PlaylistTrack[]
}

export interface Station {
  activePlaylistId?: string
  activePlaylistName?: string
  activeTrackCount?: number
  onAir?: boolean
  onAirSince?: string
}

// Response envelopes.
export interface StationResponse {
  station?: Station
}
export interface PlaylistResponse {
  playlist?: Playlist
}
export interface SummaryResponse {
  summary?: PlaylistSummary
}
export interface ListPlaylistsResponse {
  playlists?: PlaylistSummary[]
}
