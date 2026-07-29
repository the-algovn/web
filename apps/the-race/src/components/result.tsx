import { Button } from "@algovn/ui/button"
import { Check, Copy, RotateCcw, Shuffle } from "lucide-react"
import { useState } from "react"
import { duckColor, finishGaps } from "../lib/ducks"
import type { RoomHistory } from "../lib/race-client"
import type { RacePackage } from "../lib/types"

/** The winner, the proof, and the ways to go again. */
export function Result({
  race,
  history,
  onReplay,
  onRematch,
  onNewRoom,
}: {
  race: RacePackage
  history: RoomHistory | null
  onReplay: () => void
  onRematch: () => void
  onNewRoom: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [showProof, setShowProof] = useState(false)

  const winnerIndex = race.finishOrder[0] ?? 0
  const winner = race.duckNames[winnerIndex] ?? "?"
  const gaps = finishGaps(race.ticks, race.finishOrder)
  const shareUrl = `${window.location.origin}/the-race/#/r/${race.raceId}`

  const copy = () => {
    void navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="mt-2 flex w-full flex-col gap-5 md:grid md:grid-cols-2 md:items-start md:gap-6">
      <div className="flex flex-col items-center gap-2 rounded-xl border border-[#00E07A]/25 bg-[#00E07A]/[0.07] px-4 py-6 text-center">
        <p className="font-semibold text-[11px] text-[#00E07A] tracking-[0.18em]">
          THẮNG CUỘC
        </p>
        <span
          className="flex size-14 items-center justify-center rounded-full text-3xl"
          style={{ backgroundColor: duckColor(winnerIndex) }}
          aria-hidden
        >
          🦆
        </span>
        <h2 className="font-bold text-3xl">{winner}</h2>
      </div>

      <ol className="flex flex-col gap-1.5">
        {race.finishOrder.map((duck, rank) => (
          <li
            key={duck}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
              rank === 0 ? "bg-[#00E07A]/10 text-white" : "bg-white/5 text-white/80"
            }`}
          >
            <span className="w-4 text-center font-bold tabular-nums text-white/45">
              {rank + 1}
            </span>
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: duckColor(duck) }}
              aria-hidden
            />
            <span className="flex-1 truncate">{race.duckNames[duck]}</span>
            {rank > 0 && (
              <span className="font-mono text-white/45 text-xs tabular-nums">
                +{(gaps[duck] ?? 0).toFixed(1)}s
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-5 md:col-span-2">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onReplay}>
            <RotateCcw className="mr-1.5 size-4" /> Xem lại
          </Button>
          <Button onClick={onRematch}>
            <Shuffle className="mr-1.5 size-4" /> Đua lại
          </Button>
        </div>

        <Button variant="ghost" onClick={copy}>
          {copied ? (
            <Check className="mr-1.5 size-4" />
          ) : (
            <Copy className="mr-1.5 size-4" />
          )}
          {copied ? "Đã chép link" : "Chép link chia sẻ"}
        </Button>

        {history && history.tally.length > 0 && (
          <section className="rounded-md border border-white/10 p-3">
            <h3 className="font-medium text-sm text-white/80">Thành tích phòng</h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {history.tally.map((t) => (
                <li key={t.duckName} className="flex justify-between text-white/70">
                  <span>{t.duckName}</span>
                  <span>{t.wins} thắng</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-md border border-white/10 p-3">
          <button
            type="button"
            className="w-full text-left font-medium text-sm text-white/80"
            onClick={() => setShowProof((v) => !v)}
            aria-expanded={showProof}
          >
            ✓ Kiểm chứng kết quả
          </button>
          {showProof && (
            <div className="mt-2 flex flex-col gap-2 text-[11px] text-white/55">
              <p className="text-white/70 text-xs">
                Máy chủ công bố <code>sha256(server_seed)</code> trước khi biết
                nonce của bạn. Tự kiểm tra:
              </p>
              <Field label="Cam kết (công bố trước)" value={race.fairness.seedCommit} />
              <Field label="server_seed (công bố sau)" value={race.fairness.serverSeed} />
              <Field label="nonce của bạn" value={race.fairness.clientNonce} />
              <Field label="Hạt giống đã dùng" value={race.fairness.seed} />
              <p>
                <code className="text-white/70">
                  sha256(server_seed) == cam kết
                </code>{" "}
                và{" "}
                <code className="text-white/70">
                  sha256(server_seed ‖ nonce) == hạt giống
                </code>
              </p>
            </div>
          )}
        </section>

        <Button variant="ghost" size="sm" onClick={onNewRoom}>
          Phòng mới
        </Button>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-white/45">{label}</p>
      <p className="break-all font-mono text-white/70">{value || "—"}</p>
    </div>
  )
}
