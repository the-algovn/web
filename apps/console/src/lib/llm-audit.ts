// Wire types for the LLM call audit (protojson: camelCase, zero-valued fields
// omitted → every field optional; int64 id/total arrive as strings, coerce with Number()).
export const PAGE_SIZE = 20

export interface LLMCall {
  id?: string | number
  ts?: string
  label?: string
  model?: string
  provider?: string
  systemPrompt?: string
  userPrompt?: string
  output?: string
  inTokens?: number
  outTokens?: number
  costUsd?: number
  latencyMs?: number
  error?: string
  fake?: boolean
}
export interface LLMStat {
  label?: string
  model?: string
  count?: number
  inTokens?: number
  outTokens?: number
  costUsd?: number
}
export interface ListResp {
  calls?: LLMCall[]
  total?: string | number
}
export interface StatsResp {
  stats?: LLMStat[]
  totalUsd?: number
}
