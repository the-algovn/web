import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts"
import type { AuthConfig } from "./config"

export interface AuthClient {
  userManager: UserManager
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  completeSignIn: () => Promise<User>
}

const OFFLINE_ACCESS = "offline_access"

// The package owns the mechanism scope; apps declare only identity scopes.
const withOfflineAccess = (scope: string): string =>
  scope.split(/\s+/).includes(OFFLINE_ACCESS) ? scope : `${scope} ${OFFLINE_ACCESS}`

// Tokens live in shared localStorage, so every open tab arms its own renewal
// off the same expires_at and can call signinSilent() in the same instant.
// With refresh-token rotation, a second concurrent call replays an
// already-rotated token and can trip the IdP's reuse detection, signing every
// tab out. Web Locks serialise that across tabs; jsdom (this package's test
// environment) has no navigator.locks, hence the feature-detect fallback.
const withRenewLock = <T,>(fn: () => Promise<T>): Promise<T> =>
  navigator.locks ? navigator.locks.request("algovn-auth-renew", fn) : fn()

export function createAuth(config: AuthConfig): AuthClient {
  const origin = config.origin ?? window.location.origin
  const userManager = new UserManager({
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: `${origin}${config.basePath}/callback`,
    post_logout_redirect_uri: `${origin}${config.basePath}/`,
    response_type: "code",
    scope: withOfflineAccess(config.scope ?? "openid profile"),
    // The session must outlive reloads and browser restarts, so the user is
    // persisted rather than held in memory. stateStore is deliberately not set:
    // it keeps its default localStorage, and the PKCE verifier must survive the
    // redirect hop.
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    // Already the library default; pinned because this design depends on it —
    // a refresh token is useless if nothing renews. With offline_access granted,
    // signinSilent uses the refresh-token grant and never opens an iframe.
    automaticSilentRenew: true,
  })

  // A token can already be expired the moment it's loaded (e.g. the browser
  // was closed overnight) — oidc-client-ts then cancels the expiring timer and
  // fires only this one, so automaticSilentRenew (which hooks expiring, not
  // expired) never runs. Attempt the refresh-token grant here instead of
  // dropping the user: signinSilent uses it whenever a refresh token is
  // present. Only remove the user if that genuinely fails, meaning the
  // refresh token is gone or revoked. removeUser raises userUnloaded, which
  // useAuth already handles.
  userManager.events.addAccessTokenExpired(async () => {
    try {
      await withRenewLock(() => userManager.signinSilent())
    } catch {
      await userManager.removeUser()
    }
  })

  return {
    userManager,
    signIn: () => userManager.signinRedirect(),
    signOut: () => userManager.signoutRedirect(),
    completeSignIn: async () => {
      const user = await userManager.signinCallback()
      if (!user) throw new Error("no user returned from the sign-in callback")
      return user
    },
  }
}
