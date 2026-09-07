export function ListenerCount({ count }: { count: number }) {
  return (
    <span
      // role="img" (not "status"): the count changes on every join/leave, and
      // a live region here would announce each tick — the project reserves
      // aria-live for the now-playing title only. role="img" just gives the
      // span an accessible name.
      role="img"
      aria-label={`${count} người đang nghe`}
      className="radio-mono text-[11px]"
      style={{ color: "var(--radio-ink-55)" }}
    >
      {count} ĐANG NGHE
    </span>
  )
}
