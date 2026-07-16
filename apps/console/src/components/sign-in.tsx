import { Button } from "@algovn/ui/button"
import { signIn } from "../lib/auth"

export function SignIn() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3">
      <p className="font-mono text-sm">algovn console — admin only</p>
      <Button onClick={() => void signIn()}>Sign in with algovn ID</Button>
    </main>
  )
}
