import { useSignInCallback } from "@algovn/auth"
import { completeSignIn } from "../lib/auth"

// IMPORTANT: onDone must swap the view with history.replaceState — a full
// navigation would reload the page and wipe the in-memory user store.
export function Callback({ onDone }: { onDone: () => void }) {
  const { error } = useSignInCallback(completeSignIn, onDone)

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      {error ? (
        <>
          <p className="text-sm" style={{ color: "var(--destructive)" }}>
            đăng nhập lỗi: {error}
          </p>
          <a
            className="text-sm underline underline-offset-4"
            href="/radio/"
            style={{ color: "var(--radio-amber)" }}
          >
            về lại Tần Số 42
          </a>
        </>
      ) : (
        <p className="text-sm text-[color:var(--muted-foreground)]">
          đang đăng nhập…
        </p>
      )}
    </main>
  )
}
