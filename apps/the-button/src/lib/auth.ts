import {
  InMemoryWebStorage,
  UserManager,
  WebStorageStateStore,
  type User,
} from "oidc-client-ts"
import { env } from "./env"

export function createUserManager(origin: string = window.location.origin): UserManager {
  return new UserManager({
    authority: env.oidcAuthority,
    client_id: env.oidcClientId,
    redirect_uri: `${origin}/the-button/callback`,
    post_logout_redirect_uri: `${origin}/the-button/`,
    response_type: "code",
    scope: "openid profile",
    // Tokens live in memory only (spec §10). The PKCE state/verifier keeps the
    // default sessionStorage stateStore — it must survive the redirect hop.
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
  })
}

export const userManager = createUserManager()

export const signIn = (): Promise<void> => userManager.signinRedirect()

export async function completeSignIn(): Promise<User> {
  const user = await userManager.signinCallback()
  if (!user) throw new Error("no user returned from the sign-in callback")
  return user
}
