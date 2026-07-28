// The client's half of the seed.
//
// The server publishes sha256(server_seed) before it ever sees this value, so
// mixing in fresh client entropy is what stops it grinding seeds toward a
// favoured duck. Generating it here — in the browser, per race — is the whole
// point; a constant or a server-supplied nonce would give the guarantee away.

/** 32 hex characters from the platform CSPRNG. */
export function newNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}
