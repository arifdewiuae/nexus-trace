export const FIREWORKS_BASE_URL = "https://api.fireworks.ai/inference/v1"
export const DEFAULT_MODEL = "accounts/fireworks/models/qwen3p5-72b-instruct"
export const AGENT_TEMPERATURE = 0.6
export const AGENT_MAX_TOKENS = 4096

export const SEARCH_MAX_RESULTS = 5
export const SEARCH_MAX_RETRIES = 3
export const SEARCH_RETRY_DELAY_MS = 500

export const GRAPH_EVENTS = {
  CHAT_MODEL_STREAM: "on_chat_model_stream",
  TOOL_START: "on_tool_start",
  TOOL_END: "on_tool_end",
} as const

export type GraphEventName = (typeof GRAPH_EVENTS)[keyof typeof GRAPH_EVENTS]
