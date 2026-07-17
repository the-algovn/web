// Tests never hit the network: individual tests stub their own responses
// with vi.stubGlobal("fetch", ...).
globalThis.fetch = () => Promise.reject(new Error("network disabled in tests"))
