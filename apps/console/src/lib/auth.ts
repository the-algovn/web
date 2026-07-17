import { createAuth } from "@algovn/auth"
import { env } from "./env"

export const { userManager, signIn, signOut, completeSignIn } = createAuth({
  authority: env.oidcAuthority,
  clientId: env.oidcClientId,
  basePath: "/console",
  scope: "openid profile urn:zitadel:iam:org:projects:roles",
})
