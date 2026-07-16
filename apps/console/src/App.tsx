import { useState } from "react"
import { Button } from "@algovn/ui/button"
import { Callback } from "./components/callback"
import { LedgerDrawer } from "./components/ledger-drawer"
import { Shell } from "./components/shell"
import { SignIn } from "./components/sign-in"
import { signOut } from "./lib/auth"
import { rolesFromToken } from "./lib/roles"
import { useAuth } from "./lib/use-auth"

export default function App() {
  const [isCallback, setIsCallback] = useState(() =>
    window.location.pathname === "/console/callback"
  )
  const { user, token } = useAuth()
  if (isCallback) {
    return (
      <Callback
        onDone={() => {
          window.history.replaceState(null, "", "/console/")
          setIsCallback(false)
        }}
      />
    )
  }
  if (!user || !token) return <SignIn />
  const roles = rolesFromToken(token)
  return (
    <Shell
      roles={roles}
      topRight={
        <div className="flex items-center gap-2">
          <LedgerDrawer token={token} />
          <span className="text-muted-foreground text-xs">{user.profile.name ?? user.profile.sub}</span>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>Sign out</Button>
        </div>
      }
    />
  )
}
