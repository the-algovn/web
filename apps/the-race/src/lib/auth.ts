import { createAuth } from "@algovn/auth"
import { env } from "./env"

// scope defaults to "openid profile" — the server derives the room owner from
// the token's sub, and the display name from its name claim.
export const { userManager, signIn, completeSignIn } = createAuth({
  authority: env.oidcAuthority,
  clientId: env.oidcClientId,
  basePath: "/the-race",
})
