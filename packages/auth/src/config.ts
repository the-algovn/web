export interface AuthConfig {
  authority: string
  clientId: string
  /**
   * Path the SPA is served under, no trailing slash, e.g. "/the-button".
   * redirect_uri becomes `${origin}${basePath}/callback`,
   * post_logout_redirect_uri becomes `${origin}${basePath}/`.
   */
  basePath: string
  /** Defaults to "openid profile". */
  scope?: string
  /** Defaults to window.location.origin. Read at createAuth() call time, never at import. */
  origin?: string
}
