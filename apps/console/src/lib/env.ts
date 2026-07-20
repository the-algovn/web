// Build-time config. Vite folds import.meta.env at build time, so these
// defaults are dead code in a prod image — the Dockerfile build args and the
// Tiltfile serve_env are what actually decide these values.
// Defaults target the LOCAL gateway/lab, which is what Tilt wants.
export const env = {
  oidcAuthority: import.meta.env.VITE_OIDC_AUTHORITY ?? "https://id.algovn.com",
  oidcClientId:
    import.meta.env.VITE_OIDC_CLIENT_ID ?? "SET_VITE_OIDC_CLIENT_ID",
  apiBase: import.meta.env.VITE_API_BASE ?? "http://localhost:8080/radio-lab",
  // Lab benches need radio-lab, which does not deploy yet. Unset => false, so
  // prod builds ship the shell alone; the Tiltfile sets it to "true".
  enableLab: import.meta.env.VITE_ENABLE_LAB === "true",
}
