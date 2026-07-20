import { Button } from "@algovn/ui/button"
import { Checkbox } from "@algovn/ui/checkbox"
import { Input } from "@algovn/ui/input"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@algovn/ui/sheet"
import { useState } from "react"
import { formatClock } from "../lib/media"
import { useAuth } from "../lib/use-auth"
import { useLibrary } from "../lib/use-library"

// Library-backed multi-select picker. Mounted only while open so useLibrary
// fetches lazily.
export function AddTracksDrawer(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingYtIds: string[]
  busy: boolean
  onAdd: (ytIds: string[]) => void
}) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <DrawerBody {...props} /> : null}
    </Sheet>
  )
}

function DrawerBody(props: {
  existingYtIds: string[]
  busy: boolean
  onAdd: (ytIds: string[]) => void
  onOpenChange: (open: boolean) => void
}) {
  const { token } = useAuth()
  const lib = useLibrary(token)
  const [picked, setPicked] = useState<string[]>([])
  const existing = new Set(props.existingYtIds)

  function toggle(ytId: string) {
    setPicked((p) => (p.includes(ytId) ? p.filter((x) => x !== ytId) : [...p, ytId]))
  }

  return (
    <SheetContent side="right" className="flex w-96 flex-col">
      <SheetHeader>
        <SheetTitle>Add tracks</SheetTitle>
      </SheetHeader>
      <Input
        value={lib.query}
        onChange={(e) => lib.setQuery(e.target.value)}
        placeholder="title or channel"
        aria-label="Search library"
      />
      <div className="min-h-0 flex-1 overflow-auto">
        <ul className="flex flex-col gap-1">
          {lib.tracks.map((t) => {
            const yt = t.ytId ?? ""
            const inPlaylist = existing.has(yt)
            return (
              <li key={yt} className="flex items-center gap-2 px-1 py-1.5">
                <Checkbox
                  checked={inPlaylist || picked.includes(yt)}
                  disabled={inPlaylist}
                  onCheckedChange={() => toggle(yt)}
                  aria-label={`Pick ${t.title ?? ""}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{t.title}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {t.channel} · {formatClock(Number(t.durationS))}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
      <SheetFooter>
        <Button
          disabled={props.busy || picked.length === 0}
          onClick={() => {
            props.onAdd(picked)
            props.onOpenChange(false)
          }}
        >
          Add {picked.length} track{picked.length === 1 ? "" : "s"}
        </Button>
      </SheetFooter>
    </SheetContent>
  )
}
