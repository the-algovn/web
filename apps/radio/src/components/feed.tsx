import { History } from "./history"
import { NowPlayingCard } from "./now-playing"
import { Queue } from "./queue"
import type { HistoryItem, NowPlaying, QueueItem } from "../lib/radio-client"

export function Feed(props: { nowPlaying: NowPlaying | null; queue: QueueItem[]; history: HistoryItem[] }) {
  return (
    <div className="min-w-0">
      <NowPlayingCard np={props.nowPlaying} />
      <Queue items={props.queue} />
      <History items={props.history} />
    </div>
  )
}
