import {
  InMemoryWebStorage,
  UserManager,
  WebStorageStateStore,
  type User,
} from "oidc-client-ts"
import type { AuthConfig } from "./config"

export interface AuthClient {
  userManager: UserManager
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  completeSignIn: () => Promise<User>
}

export function createAuth(config: AuthConfig): AuthClient {
  const origin = config.origin ?? window.location.origin
  const userManager = new UserManager({
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: `${origin}${config.basePath}/callback`,
    post_logout_redirect_uri: `${origin}${config.basePath}/`,
    response_type: "code",
    scope: config.scope ?? "openid profile",
    // Tokens live in memory only (spec §10) — this overrides userStore, which
    // would otherwise default to sessionStorage. stateStore is left alone: the
    // PKCE state/verifier keeps its default localStorage and must survive the
    // redirect hop.
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
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
