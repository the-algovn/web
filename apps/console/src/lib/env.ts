// Local-first: the console is dev-only in Phase 0, so defaults point at the
// LOCAL gateway/lab. VITE_* overrides come from the Tiltfile.
export const env = {
  oidcAuthority: import.meta.env.VITE_OIDC_AUTHORITY ?? "https://id.algovn.com",
  oidcClientId: import.meta.env.VITE_OIDC_CLIENT_ID ?? "SET_VITE_OIDC_CLIENT_ID",
  apiBase: import.meta.env.VITE_API_BASE ?? "http://localhost:8080/radio-lab",
  artifactsBase: import.meta.env.VITE_ARTIFACTS_BASE ?? "http://localhost:9291",
}
