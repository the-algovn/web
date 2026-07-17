import { useEffect, useState } from "react"
import type { User, UserManager } from "oidc-client-ts"

export function useAuth(userManager: UserManager): { user: User | null; token: string | null } {
  const [user, setUser] = useState<User | null>(null)
  useEffect(() => {
    let cancelled = false
    void userManager.getUser().then(u => {
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
