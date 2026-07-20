import type { User, UserManager } from "oidc-client-ts"
import { useEffect, useState } from "react"

export function useAuth(userManager: UserManager): {
  user: User | null
  token: string | null
} {
  const [user, setUser] = useState<User | null>(null)
  useEffect(() => {
    // guards against a stale-manager clobber: if a re-render swaps in a
    // different userManager, a slow getUser() from the old one must not
    // overwrite state set by the new one. Untested — unreachable while both
    // apps pass a module-scope singleton through this hook. Do not remove.
    let cancelled = false
    void userManager.getUser().then((u) => {
      if (!cancelled) setUser(u && !u.expired ? u : null)
    })
    const onLoaded = (u: User) => setUser(u)
    const onUnloaded = () => setUser(null)
    userManager.events.addUserLoaded(onLoaded)
    userManager.events.addUserUnloaded(onUnloaded)
    return () => {
      cancelled = true
      userManager.events.removeUserLoaded(onLoaded)
      userManager.events.removeUserUnloaded(onUnloaded)
    }
  }, [userManager])
  return { user, token: user?.access_token ?? null }
}
