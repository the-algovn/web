import { createAuth } from "@algovn/auth"
import { env } from "./env"

// scope defaults to "openid profile" — the-button needs no role claims.
export const { userManager, signIn, completeSignIn } = createAuth({
  authority: env.oidcAuthority,
  clientId: env.oidcClientId,
  basePath: "/the-button",
})
