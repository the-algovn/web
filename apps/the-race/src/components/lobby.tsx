import { Button } from "@algovn/ui/button"
import { Input } from "@algovn/ui/input"
import { Plus, X } from "lucide-react"
import { useState } from "react"

const MAX_DUCKS = 12
const MIN_DUCKS = 2

/** Naming the room and the ducks. The one screen that needs a signed-in user. */
export function Lobby({
  signedIn,
  authConfigured,
  busy,
  error,
  onSignIn,
  onStart,
}: {
  signedIn: boolean
  authConfigured: boolean
  busy: boolean
  error: string
  onSignIn: () => void
  onStart: (title: string, duckNames: string[]) => void
}) {
  const [title, setTitle] = useState("Ai trả tiền cà phê?")
  const [names, setNames] = useState(["", ""])

  const filled = names.map((n) => n.trim()).filter(Boolean)
  const ready = title.trim().length > 0 && filled.length >= MIN_DUCKS

  const setName = (i: number, v: string) =>
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)))

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-8">
      <header className="text-center">
        <h1 className="font-semibold text-2xl tracking-tight">🦆 Đua Vịt</h1>
        <p className="mt-1 text-sm text-white/60">
          Để đàn vịt quyết định. Kết quả ngẫu nhiên, và chứng minh được.
        </p>
      </header>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="race-title" className="font-medium text-sm">
          Cuộc đua này quyết định gì?
        </label>
        <Input
          id="race-title"
          value={title}
          maxLength={60}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ai trả tiền cà phê?"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium text-sm">
          Các tay đua ({filled.length}/{MAX_DUCKS})
        </legend>
        {names.map((name, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional; a name is not a stable identity while it is being typed
          <div key={i} className="flex items-center gap-2">
            <span aria-hidden className="w-5 text-center text-white/40">
              {i + 1}
            </span>
            <Input
              value={name}
              maxLength={24}
              aria-label={`Tên vịt ${i + 1}`}
              onChange={(e) => setName(i, e.target.value)}
              placeholder="Tên..."
            />
            {names.length > MIN_DUCKS && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Xóa vịt ${i + 1}`}
                onClick={() => setNames((p) => p.filter((_, idx) => idx !== i))}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}

        {names.length < MAX_DUCKS && (
          <Button
            type="button"
            variant="outline"
            className="mt-1"
            onClick={() => setNames((p) => [...p, ""])}
          >
            <Plus className="mr-1 size-4" /> Thêm vịt
          </Button>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="text-red-400 text-sm">
          {error}
        </p>
      )}

      {!authConfigured ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200/90 text-sm">
          Chưa đăng ký ứng dụng đăng nhập, nên chưa tạo phòng được. Bạn vẫn xem
          được cuộc đua qua link chia sẻ.
        </p>
      ) : signedIn ? (
        <Button
          size="lg"
          disabled={!ready || busy}
          onClick={() => onStart(title.trim(), filled)}
        >
          {busy ? "Đang chuẩn bị..." : "Thả vịt!"}
        </Button>
      ) : (
        <Button size="lg" onClick={onSignIn}>
          Đăng nhập để tạo phòng
        </Button>
      )}
    </div>
  )
}
