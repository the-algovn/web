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

  // A token that expired without renewing means the refresh token is gone or
  // revoked. Drop the user so the UI shows signed-out instead of firing calls
  // the gateway will 401. removeUser raises userUnloaded, which useAuth already
  // handles.
  userManager.events.addAccessTokenExpired(() => void userManager.removeUser())

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
