import { createApiClient } from "@algovn/api"
import { env } from "./env"

export { ApiError } from "@algovn/api"

const { request } = createApiClient({ baseUrl: env.apiBase })

// GET when body is undefined, POST otherwise. Gateway errors arrive as
// {"code":"<grpc-code>","message":"…"} (api-conventions.md).
export function labCall<T>(
  token: string,
  path: string,
  body?: unknown,
): Promise<T> {
  return request<T>(body === undefined ? "GET" : "POST", path, body, token)
}

export const artifactUrl = (id: string): string =>
  `${env.artifactsBase}/artifacts/${id}`

// Resolve an artifact id to a time-limited presigned MinIO GET URL (artifacts
// are private in object storage; there is no static URL).
export function presignArtifact(
  token: string,
  id: string,
): Promise<{ url?: string }> {
  return labCall<{ url?: string }>(token, "/artifacts/presign", { id })
}
