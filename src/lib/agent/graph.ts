import { ChatOpenAI } from "@langchain/openai"
import { ChatAnthropic } from "@langchain/anthropic"
import { createAgent } from "langchain"
import { AIMessage, HumanMessage } from "@langchain/core/messages"
import { createTools } from "./tools"
import { AGENT_SYSTEM_PROMPT } from "./prompt"
import { STREAM_EVENT, encodeEvent } from "@/lib/streaming/types"
import { MODEL_LABEL, MESSAGE_ROLE, type ApiKeys } from "@/lib/types"
import {
  FIREWORKS_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_ANTHROPIC_MODEL,
  PROVIDER,
  type Provider,
  AGENT_TEMPERATURE,
  AGENT_MAX_TOKENS,
  AGENT_RECURSION_LIMIT,
  HISTORY_MAX_TURNS,
  HISTORY_MAX_CHARS_PER_MESSAGE,
  GRAPH_EVENTS,
  FINISH_REASON,
  CONTENT_BLOCK_TYPE_TEXT,
  LANGSMITH_RUN_NAME,
  MODEL_PRICING,
  DEFAULT_MODEL_PRICING,
} from "@/lib/config"

// LangChain auto-traces to LangSmith when either env flag is set (v1 uses LANGSMITH_TRACING,
// older setups LANGCHAIN_TRACING_V2). We only forward the run id to the client when it's on.
function langsmithEnabled(): boolean {
  return process.env.LANGSMITH_TRACING === "true" || process.env.LANGCHAIN_TRACING_V2 === "true"
}

// The active LLM model id for the given provider — used for pricing lookup and trace metadata.
function activeModelId(provider: Provider): string {
  return provider === PROVIDER.ANTHROPIC
    ? (process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL)
    : (process.env.FIREWORKS_MODEL ?? DEFAULT_MODEL)
}

interface RunContext {
  pricing: { inputPer1M: number; outputPer1M: number }
  startTime: number
  stepIndex: number
  totalInputTokens: number
  totalOutputTokens: number
  firstTokenTime: number | null
  toolStartTimes: Map<string, number>
  modelStartTimes: Map<string, number>
  modelHasTokens: Set<string>
  // Accumulated reasoning_content per model call — surfaced in the trace, never in the answer.
  reasoningByRun: Map<string, string>
  // Set when the model stops because it hit the output-token cap (finish_reason "length").
  truncated: boolean
  // Root LangSmith run id (first streamed event's run_id) — surfaced for the dev-only deep link.
  rootRunId: string | null
}

// Provider-aware model factory (adapter swap). Anthropic and Fireworks both plug into
// createAgent/streamEvents identically; only the client class and key differ.
function createModel(keys: ApiKeys, provider: Provider) {
  // resolveKeys() (the request boundary) guarantees the active provider's key is present.
  // Resolve it here so the type narrows to `string` and a mis-wired caller fails fast and
  // clearly instead of the SDK silently falling back to an env var.
  const apiKey = provider === PROVIDER.ANTHROPIC ? keys.anthropicKey : keys.fireworksKey
  if (!apiKey) throw new Error(`Missing API key for provider "${provider}"`)

  if (provider === PROVIDER.ANTHROPIC) {
    return new ChatAnthropic({
      model: activeModelId(provider),
      apiKey,
      streaming: true,
      temperature: AGENT_TEMPERATURE,
      maxTokens: AGENT_MAX_TOKENS,
    })
  }
  // Fireworks speaks the OpenAI wire format, so ChatOpenAI re-pointed at its base URL.
  return new ChatOpenAI({
    modelName: activeModelId(provider),
    openAIApiKey: apiKey,
    configuration: {
      baseURL: process.env.FIREWORKS_BASE_URL ?? FIREWORKS_BASE_URL,
      apiKey,
    },
    streaming: true,
    temperature: AGENT_TEMPERATURE,
    maxTokens: AGENT_MAX_TOKENS,
  })
}

export function trimHistory(history: { role: string; content: string }[]) {
  const maxMessages = HISTORY_MAX_TURNS * 2

  return history.slice(-maxMessages).map((m) =>
    m.content.length > HISTORY_MAX_CHARS_PER_MESSAGE
      ? { ...m, content: m.content.slice(0, HISTORY_MAX_CHARS_PER_MESSAGE) + "…" }
      : m
  )
}

function extractToolResult(output: unknown): unknown {
  if (output && typeof output === "object" && "kwargs" in output) {
    return (output as { kwargs: { content?: unknown } }).kwargs.content ?? output
  }
  return output
}

interface ModelEndOutput {
  usage_metadata?: { input_tokens?: number; output_tokens?: number }
  response_metadata?: {
    token_usage?: { prompt_tokens?: number; completion_tokens?: number }
    // OpenAI/Fireworks report "length"; Anthropic reports stop_reason "max_tokens".
    finish_reason?: string
    stop_reason?: string
  }
  additional_kwargs?: { reasoning_content?: string; reasoning?: string }
}

// Token usage arrives as either LangChain's `usage_metadata` or the raw OpenAI-shaped
// `response_metadata.token_usage`. Read both; warn (don't silently zero) if neither is present,
// since a model/API change here otherwise shows the user a $0 cost.
function extractTokenUsage(data: unknown): { input: number; output: number } {
  const output = (data as { output?: ModelEndOutput })?.output
  const usage = output?.usage_metadata
  const tokenUsage = output?.response_metadata?.token_usage

  if (!usage && !tokenUsage) {
    console.warn("[graph] no token usage in model-end event; cost will under-count")
    return { input: 0, output: 0 }
  }
  return {
    input: usage?.input_tokens ?? tokenUsage?.prompt_tokens ?? 0,
    output: usage?.output_tokens ?? tokenUsage?.completion_tokens ?? 0,
  }
}

function createRunContext(modelId: string): RunContext {
  return {
    pricing: MODEL_PRICING[modelId] ?? DEFAULT_MODEL_PRICING,
    startTime: Date.now(),
    stepIndex: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    firstTokenTime: null,
    toolStartTimes: new Map(),
    modelStartTimes: new Map(),
    modelHasTokens: new Set(),
    reasoningByRun: new Map(),
    truncated: false,
    rootRunId: null,
  }
}

function* onModelStart(ctx: RunContext, runId: string): Generator<string> {
  ctx.modelStartTimes.set(runId, Date.now())
  yield encodeEvent({ type: STREAM_EVENT.MODEL_START, modelCallId: runId, label: MODEL_LABEL.REASONING })
}

// LangChain delivers streamed text as a plain string (Fireworks via ChatOpenAI) or, when tools
// are bound to the model, as an array of content blocks (Anthropic via ChatAnthropic). Extract
// just the answer text from either shape — tool-call (input_json_delta) and thinking blocks are
// skipped so they never leak into the reply.
function extractStreamText(content: unknown): string {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  let text = ""
  for (const block of content as { type?: string; text?: string }[]) {
    if (block?.type === CONTENT_BLOCK_TYPE_TEXT && block.text) text += block.text
  }
  return text
}

function* onModelStream(ctx: RunContext, runId: string, data: unknown): Generator<string> {
  const chunk = (
    data as {
      chunk?: {
        content?: unknown
        tool_call_chunks?: unknown[]
        additional_kwargs?: { reasoning_content?: unknown; reasoning?: unknown }
      }
    }
  )?.chunk
  // Reasoning tokens stream separately from the answer (often before any content) — accumulate
  // them per model call so the trace can show the model's thinking without leaking it into the reply.
  const reasoningDelta = chunk?.additional_kwargs?.reasoning_content ?? chunk?.additional_kwargs?.reasoning

  if (typeof reasoningDelta === "string" && reasoningDelta.length > 0) {
    ctx.reasoningByRun.set(runId, (ctx.reasoningByRun.get(runId) ?? "") + reasoningDelta)
  }
  const text = extractStreamText(chunk?.content)
  const toolCallChunks = chunk?.tool_call_chunks ?? []

  if (text.length > 0 && toolCallChunks.length === 0) {
    if (!ctx.modelHasTokens.has(runId)) {
      ctx.modelHasTokens.add(runId)
      ctx.firstTokenTime ??= Date.now()
      yield encodeEvent({ type: STREAM_EVENT.MODEL_START, modelCallId: runId, label: MODEL_LABEL.RESPONDING })
    }
    yield encodeEvent({ type: STREAM_EVENT.TOKEN_DELTA, content: text })
  }
}

function* onModelEnd(ctx: RunContext, runId: string, data: unknown): Generator<string> {
  const durationMs = Date.now() - (ctx.modelStartTimes.get(runId) ?? Date.now())

  ctx.modelStartTimes.delete(runId)
  ctx.modelHasTokens.delete(runId)
  const usage = extractTokenUsage(data)

  ctx.totalInputTokens += usage.input
  ctx.totalOutputTokens += usage.output
  const output = (data as { output?: ModelEndOutput })?.output

  const meta = output?.response_metadata
  if (
    meta?.finish_reason === FINISH_REASON.OPENAI_LENGTH ||
    meta?.stop_reason === FINISH_REASON.ANTHROPIC_MAX_TOKENS
  ) {
    ctx.truncated = true
  }
  // Prefer the streamed reasoning; fall back to a non-streamed reasoning_content on the final message.
  const streamed = ctx.reasoningByRun.get(runId)
  ctx.reasoningByRun.delete(runId)
  const reasoning = (streamed ?? output?.additional_kwargs?.reasoning_content ?? output?.additional_kwargs?.reasoning)?.trim()

  yield encodeEvent({
    type: STREAM_EVENT.MODEL_END,
    modelCallId: runId,
    durationMs,
    reasoning: reasoning ? reasoning : undefined,
  })
}

function* onToolStart(ctx: RunContext, runId: string, name: string | undefined, data: unknown): Generator<string> {
  ctx.toolStartTimes.set(runId, Date.now())

  yield encodeEvent({
    type: STREAM_EVENT.TOOL_START,
    toolName: name ?? "unknown",
    toolCallId: runId,
    args: (data as { input?: unknown })?.input ?? {},
  })
}

function* onToolEnd(ctx: RunContext, runId: string, name: string | undefined, data: unknown): Generator<string> {
  const durationMs = Date.now() - (ctx.toolStartTimes.get(runId) ?? Date.now())
  ctx.toolStartTimes.delete(runId)

  yield encodeEvent({
    type: STREAM_EVENT.TOOL_RESULT,
    toolName: name ?? "unknown",
    toolCallId: runId,
    result: extractToolResult((data as { output?: unknown })?.output),
    durationMs,
  })

  ctx.stepIndex++
  yield encodeEvent({ type: STREAM_EVENT.STEP_END, stepIndex: ctx.stepIndex })
}

function* buildDoneEvent(ctx: RunContext): Generator<string> {
  const hasUsage = ctx.totalInputTokens + ctx.totalOutputTokens > 0
  
  yield encodeEvent({
    type: STREAM_EVENT.DONE,
    totalSteps: ctx.stepIndex,
    latencyMs: Date.now() - ctx.startTime,
    ttftMs: ctx.firstTokenTime != null ? ctx.firstTokenTime - ctx.startTime : undefined,
    inputTokens: hasUsage ? ctx.totalInputTokens : undefined,
    outputTokens: hasUsage ? ctx.totalOutputTokens : undefined,
    estimatedCostUsd: hasUsage
      ? (ctx.totalInputTokens * ctx.pricing.inputPer1M + ctx.totalOutputTokens * ctx.pricing.outputPer1M) / 1_000_000
      : undefined,
    truncated: ctx.truncated ? true : undefined,
    langsmithRunId: langsmithEnabled() && ctx.rootRunId ? ctx.rootRunId : undefined,
  })
}

export async function* runAgentStream(
  userMessage: string,
  history: { role: string; content: string }[] = [],
  keys: ApiKeys,
  provider: Provider
): AsyncGenerator<string> {
  const modelId = activeModelId(provider)
  const graph = createAgent({
    model: createModel(keys, provider),
    tools: createTools(keys.tavilyKey),
    systemPrompt: AGENT_SYSTEM_PROMPT,
  })

  const ctx = createRunContext(modelId)

  const historyMessages = trimHistory(history).map((m) =>
    m.role === MESSAGE_ROLE.USER ? new HumanMessage(m.content) : new AIMessage(m.content)
  )

  // Names/tags this run in the LangSmith project so it's easy to find in the dashboard.
  // Bound via withConfig because the Pregel streamEvents options type doesn't accept
  // runName/tags/metadata directly.
  const eventStream = graph
    .withConfig({ runName: LANGSMITH_RUN_NAME, tags: [provider], metadata: { provider, model: modelId } })
    .streamEvents(
      { messages: [...historyMessages, new HumanMessage(userMessage)] },
      { version: "v2", recursionLimit: AGENT_RECURSION_LIMIT }
    )

  for await (const event of eventStream) {
    const { event: eventName, name, data } = event
    const runId: string = event.run_id ?? `run-${ctx.stepIndex}`
    // The first streamed event is the graph root — its run_id is the LangSmith trace root.
    ctx.rootRunId ??= event.run_id ?? null

    if (eventName === GRAPH_EVENTS.CHAT_MODEL_START) yield* onModelStart(ctx, runId)
    if (eventName === GRAPH_EVENTS.CHAT_MODEL_STREAM) yield* onModelStream(ctx, runId, data)
    if (eventName === GRAPH_EVENTS.CHAT_MODEL_END) yield* onModelEnd(ctx, runId, data)
    if (eventName === GRAPH_EVENTS.TOOL_START) yield* onToolStart(ctx, runId, name, data)
    if (eventName === GRAPH_EVENTS.TOOL_END) yield* onToolEnd(ctx, runId, name, data)
  }

  yield* buildDoneEvent(ctx)
}
