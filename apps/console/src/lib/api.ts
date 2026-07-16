import { env } from "./env"

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// GET when body is undefined, POST otherwise. Gateway errors arrive as
// {"code":"<grpc-code>","message":"…"} (api-conventions.md).
export async function labCall<T>(token: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${env.apiBase}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const j = (await res.json()) as { message?: string }
      if (j.message) msg = j.message
    } catch { /* non-JSON error body */ }
    throw new ApiError(res.status, msg)
  }
  return (await res.json()) as T
}

export const artifactUrl = (id: string): string => `${env.artifactsBase}/artifacts/${id}`
