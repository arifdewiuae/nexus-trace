// ─── App metadata (shared by layout metadata + PWA manifest) ─────────────────
export const APP_NAME = "Nexus Trace"
export const APP_TITLE = "Nexus Trace — Streaming AI Agent"
export const APP_DESCRIPTION = "A streaming AI agent with live tool-call trace visualization."
export const APP_AUTHOR = "Arif Dewi"

export const FIREWORKS_BASE_URL = "https://api.fireworks.ai/inference/v1"
export const OPENAI_MODERATION_URL = "https://api.openai.com/v1/moderations"
export const DEFAULT_MODEL = "accounts/fireworks/models/minimax-m2p7"
export const AGENT_TEMPERATURE = 0.3
export const AGENT_MAX_TOKENS = 2048

// ─── LLM provider ─────────────────────────────────────────────────────────────
// The active provider is a deploy-level choice (adapter-swap), read from LLM_PROVIDER
// on the server and NEXT_PUBLIC_LLM_PROVIDER on the client. Fireworks is the default;
// set both to "anthropic" (and provide an Anthropic key) to run Claude instead.
export const PROVIDER = {
  FIREWORKS: "fireworks",
  ANTHROPIC: "anthropic",
} as const

export type Provider = (typeof PROVIDER)[keyof typeof PROVIDER]

// Pure, testable resolver — anything other than "anthropic" falls back to Fireworks.
export function resolveProvider(value: string | undefined): Provider {
  return value === PROVIDER.ANTHROPIC ? PROVIDER.ANTHROPIC : PROVIDER.FIREWORKS
}

// Claude via @langchain/anthropic. Sonnet 4.6 accepts the shared AGENT_TEMPERATURE
// (Sonnet 5 rejects non-default sampling params), so it's the safe default here.
// Override with ANTHROPIC_MODEL.
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6"

// ─── LangSmith (dev-only observability link) ──────────────────────────────────
// Run name applied to every agent run so it's easy to find in the LangSmith project.
export const LANGSMITH_RUN_NAME = "nexus-trace-chat"
// Fallback base when NEXT_PUBLIC_LANGSMITH_PROJECT_URL is unset; the run id is
// appended as a deep link (`/r/<runId>`) when a project URL is provided.
export const LANGSMITH_APP_URL = "https://smith.langchain.com"

// Build the "View in LangSmith" href. Prefer a per-run deep link off the dev's
// project URL; otherwise link the LangSmith app so they can find the run manually.
export function langsmithRunUrl(runId: string): string {
  const projectUrl = process.env.NEXT_PUBLIC_LANGSMITH_PROJECT_URL
  return projectUrl ? `${projectUrl.replace(/\/$/, "")}/r/${runId}` : LANGSMITH_APP_URL
}

export const SEARCH_MAX_RESULTS = 3
export const SEARCH_MAX_RETRIES = 3
export const SEARCH_RETRY_DELAY_MS = 500
export const SEARCH_RECENCY_DAYS = 90

export const AGENT_MAX_ITERATIONS = 4
// Each ReAct iteration runs two graph nodes (model + tool); the buffer covers the
// final model turn plus one node of slack. This is the LangGraph recursionLimit.
export const NODES_PER_ITERATION = 2
export const AGENT_RECURSION_BUFFER = 2
export const AGENT_RECURSION_LIMIT =
  AGENT_MAX_ITERATIONS * NODES_PER_ITERATION + AGENT_RECURSION_BUFFER
export const HISTORY_MAX_TURNS = 10
export const HISTORY_MAX_CHARS_PER_MESSAGE = 2000

export const STORAGE_KEY_MESSAGES = "nexus-trace:messages"
export const STORAGE_KEY_TRACE_STEPS = "nexus-trace:trace-steps"
export const STORAGE_KEY_API_KEYS = "nexus-trace:api-keys"
export const STORAGE_KEY_PROVIDER = "nexus-trace:provider"
export const STORAGE_KEY_SESSION_USAGE = "nexus-trace:session-usage"

// Fireworks serverless pricing per 1M tokens (standard tier)
export const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "accounts/fireworks/models/gpt-oss-120b": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "accounts/fireworks/models/gpt-oss-20b": { inputPer1M: 0.07, outputPer1M: 0.30 },
  "accounts/fireworks/models/llama-v3p3-70b-instruct": { inputPer1M: 0.20, outputPer1M: 0.80 },
  "accounts/fireworks/models/minimax-m2p7": { inputPer1M: 0.30, outputPer1M: 1.20 },
  // Anthropic Claude pricing per 1M tokens (standard tier)
  "claude-sonnet-4-6": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-sonnet-5": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-haiku-4-5": { inputPer1M: 1.0, outputPer1M: 5.0 },
  "claude-opus-4-8": { inputPer1M: 5.0, outputPer1M: 25.0 },
}
// Fallback for any other model (70B+ serverless tier)
export const DEFAULT_MODEL_PRICING = { inputPer1M: 0.22, outputPer1M: 0.88 }

export const MOBILE_BREAKPOINT_PX = 768
export const TRACE_PANEL_WIDTH_PX = 420
export const TEXTAREA_MAX_HEIGHT_PX = 160

export const HEADER_FIREWORKS_KEY = "x-fireworks-key"
export const HEADER_ANTHROPIC_KEY = "x-anthropic-key"
export const HEADER_TAVILY_KEY = "x-tavily-key"
export const HEADER_OPENAI_KEY = "x-openai-key"
// Per-request LLM provider override chosen in the UI; server falls back to LLM_PROVIDER env.
export const HEADER_LLM_PROVIDER = "x-llm-provider"

// "Get a key" dashboard links shown in the Settings modal.
export const FIREWORKS_KEYS_URL = "https://app.fireworks.ai/settings/users/api-keys"
export const ANTHROPIC_KEYS_URL = "https://console.anthropic.com/settings/keys"
export const TAVILY_KEYS_URL = "https://app.tavily.com/home"
export const OPENAI_KEYS_URL = "https://platform.openai.com/api-keys"

// Server route the client streams from (served by app/api/chat/route.ts).
export const CHAT_API_PATH = "/api/chat"

export const SESSION_COOKIE_NAME = "nexus-sid"
export const SESSION_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365
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

// Provider-specific "output was cut off at the token cap" signals: OpenAI/Fireworks put
// "length" in finish_reason; Anthropic puts "max_tokens" in stop_reason.
export const FINISH_REASON = {
  OPENAI_LENGTH: "length",
  ANTHROPIC_MAX_TOKENS: "max_tokens",
} as const

// LangChain streamed-content block discriminator we care about (Anthropic array-mode chunks).
export const CONTENT_BLOCK_TYPE_TEXT = "text"
