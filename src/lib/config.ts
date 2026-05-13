export const FIREWORKS_BASE_URL = "https://api.fireworks.ai/inference/v1"
export const DEFAULT_MODEL = "accounts/fireworks/models/gpt-oss-120b"
export const AGENT_TEMPERATURE = 0.3
export const AGENT_MAX_TOKENS = 2048

export const SEARCH_MAX_RESULTS = 3
export const SEARCH_MAX_RETRIES = 3
export const SEARCH_RETRY_DELAY_MS = 500
export const SEARCH_RECENCY_DAYS = 90

export const AGENT_MAX_ITERATIONS = 4

export const STORAGE_KEY_MESSAGES = "nexus-trace:messages"
export const STORAGE_KEY_TRACE_STEPS = "nexus-trace:trace-steps"
export const STORAGE_KEY_API_KEYS = "nexus-trace:api-keys"
export const STORAGE_KEY_QUERY_USAGE = "nexus-trace:query-usage"
export const STORAGE_KEY_SESSION_USAGE = "nexus-trace:session-usage"

// Fireworks serverless pricing per 1M tokens (standard tier)
export const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "accounts/fireworks/models/gpt-oss-120b": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "accounts/fireworks/models/gpt-oss-20b": { inputPer1M: 0.07, outputPer1M: 0.30 },
}
// Fallback for any other model (70B+ serverless tier)
export const DEFAULT_MODEL_PRICING = { inputPer1M: 0.22, outputPer1M: 0.88 }

export const HEADER_FIREWORKS_KEY = "x-fireworks-key"
export const HEADER_TAVILY_KEY = "x-tavily-key"

export const SESSION_COOKIE_NAME = "nexus-sid"
export const MAX_MESSAGE_LENGTH = 4000
export const RATE_LIMIT_DEMO_MAX = 20
export const RATE_LIMIT_OWN_KEY_MAX = 100
export const RATE_LIMIT_WINDOW_S = 3600

export const GRAPH_EVENTS = {
  CHAT_MODEL_START: "on_chat_model_start",
  CHAT_MODEL_STREAM: "on_chat_model_stream",
  CHAT_MODEL_END: "on_chat_model_end",
  TOOL_START: "on_tool_start",
  TOOL_END: "on_tool_end",
} as const

export type GraphEventName = (typeof GRAPH_EVENTS)[keyof typeof GRAPH_EVENTS]
