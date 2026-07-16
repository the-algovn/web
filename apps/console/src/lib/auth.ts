import { InMemoryWebStorage, UserManager, WebStorageStateStore, type User } from "oidc-client-ts"
import { env } from "./env"

export function createUserManager(origin: string = window.location.origin): UserManager {
  return new UserManager({
    authority: env.oidcAuthority,
    client_id: env.oidcClientId,
    redirect_uri: `${origin}/console/callback`,
    post_logout_redirect_uri: `${origin}/console/`,
    response_type: "code",
    scope: "openid profile urn:zitadel:iam:org:projects:roles",
    // Tokens live in memory only (spec §10). The PKCE state/verifier keeps the
    // default sessionStorage stateStore — it must survive the redirect hop.
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
  })
}

export const userManager = createUserManager()
export const signIn = (): Promise<void> => userManager.signinRedirect()
export const signOut = (): Promise<void> => userManager.signoutRedirect()

export async function completeSignIn(): Promise<User> {
  const user = await userManager.signinCallback()
  if (!user) throw new Error("no user returned from the sign-in callback")
  return user
}
