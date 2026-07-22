import type { HistoryItem, NowPlaying, QueueItem } from "../lib/radio-client"
import type { TrackRequest } from "../lib/request-client"
import { History } from "./history"
import { MyRequests } from "./my-requests"
import { NowPlayingCard } from "./now-playing"
import { Queue } from "./queue"

export function Feed(props: {
  nowPlaying: NowPlaying | null
  queue: QueueItem[]
  history: HistoryItem[]
  requests?: TrackRequest[]
}) {
  return (
    <div className="min-w-0">
      <NowPlayingCard np={props.nowPlaying} />
      <Queue items={props.queue} />
      {props.requests && <MyRequests requests={props.requests} />}
      <History items={props.history} />
    </div>
  )
}
