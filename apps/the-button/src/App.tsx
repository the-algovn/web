import { useState } from "react"
import { Button } from "@algovn/ui/button"
import { Callback } from "./components/callback"
import { signIn } from "./lib/auth"
import { useAuth } from "./lib/use-auth"

// No router: the app has exactly two views — the page and the OIDC callback.
export default function App() {
  const [isCallback, setIsCallback] = useState(() =>
    window.location.pathname.endsWith("/callback")
  )
  if (isCallback) {
    return (
      <Callback
        onDone={() => {
          window.history.replaceState(null, "", "/the-button/")
          setIsCallback(false)
        }}
      />
    )
  }
  return <Home />
}

function Home() {
  const { user } = useAuth()
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="font-mono text-3xl font-semibold tracking-tight sm:text-4xl">the button</h1>
      <p className="text-muted-foreground text-sm">every click is a tiny rebellion</p>
      {user ? (
        <p className="text-sm">
          signed in as {user.profile.preferred_username ?? user.profile.sub}
        </p>
      ) : (
        <Button size="lg" onClick={() => void signIn()}>
          sign in to contribute
        </Button>
      )}
    </main>
  )
}
