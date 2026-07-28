import { Lock } from "lucide-react"

const STAGES: { key: string; label: string }[] = [
  { key: "simulating", label: "Dựng cuộc đua" },
  { key: "commentating", label: "Viết lời bình" },
  { key: "voicing", label: "Thu giọng đọc" },
  // Client-side: every clip is decoded before the gun, so the race never waits
  // on the network once it has started.
  { key: "decoding", label: "Tải âm thanh" },
]

/**
 * The wait, staged. The seed commit lands here on purpose: it is published
 * before the race exists, so showing it now is the moment the fairness claim
 * actually means something.
 */
export function Preparing({
  stage,
  seedCommit,
}: {
  stage: string
  seedCommit: string
}) {
  const reached = STAGES.findIndex((s) => s.key === stage)
  const current = reached === -1 ? 0 : reached

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-16 text-center">
      <div className="text-5xl" aria-hidden>
        🦆
      </div>
      <h2 className="font-semibold text-xl">Đang chuẩn bị đường đua...</h2>

      <ol className="flex w-full flex-col gap-2" aria-live="polite">
        {STAGES.map((s, i) => (
          <li
            key={s.key}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              i <= current
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 text-white/40"
            }`}
          >
            <span aria-hidden>{i < current ? "✓" : i === current ? "•" : "○"}</span>
            {s.label}
          </li>
        ))}
      </ol>

      {seedCommit && (
        <div className="w-full rounded-md border border-white/10 bg-black/30 p-3 text-left">
          <p className="flex items-center gap-1.5 font-medium text-white/80 text-xs">
            <Lock className="size-3.5" /> Đã niêm phong kết quả
          </p>
          <p className="mt-1 break-all font-mono text-[11px] text-white/45">
            {seedCommit}
          </p>
          <p className="mt-1.5 text-[11px] text-white/50">
            Máy chủ đã cam kết trước khi cuộc đua tồn tại. Kiểm chứng được sau khi
            đua xong.
          </p>
        </div>
      )}
    </div>
  )
}
