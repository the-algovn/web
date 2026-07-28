import { useEffect, useState } from "react"
import { completeSignIn } from "../lib/auth"

/** The OIDC redirect lands here, swaps the code for a token, then goes home. */
export function Callback() {
  const [error, setError] = useState("")

  useEffect(() => {
    completeSignIn()
      .then(() => {
        window.location.replace("/the-race/")
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Đăng nhập thất bại")
      })
  }, [])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#071a20] p-6 text-white">
      {error ? (
        <div role="alert" className="text-center">
          <p className="text-red-400">{error}</p>
          <a href="/the-race/" className="mt-2 inline-block text-sm underline">
            Quay lại
          </a>
        </div>
      ) : (
        <p className="text-white/60">Đang đăng nhập...</p>
      )}
    </main>
  )
}
