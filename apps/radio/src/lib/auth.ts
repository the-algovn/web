import { createAuth } from "@algovn/auth"
import { env } from "./env"

// scope defaults to "openid profile" — the radio SPA needs no role claims;
// the server derives the on-air display name from the token's name claim.
export const { userManager, signIn, completeSignIn } = createAuth({
  authority: env.oidcAuthority,
  clientId: env.oidcClientId,
  basePath: "/radio",
})
