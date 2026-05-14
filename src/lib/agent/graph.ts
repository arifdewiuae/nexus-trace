import { ChatOpenAI } from "@langchain/openai"
import { createAgent } from "langchain"
import { AIMessage, HumanMessage } from "@langchain/core/messages"
import { createTools } from "./tools"
import { AGENT_SYSTEM_PROMPT } from "./state"
import { STREAM_EVENT, encodeEvent } from "@/lib/streaming/types"
import { MODEL_LABEL, type ApiKeys } from "@/lib/types"
import {
  FIREWORKS_BASE_URL,
  DEFAULT_MODEL,
  AGENT_TEMPERATURE,
  AGENT_MAX_TOKENS,
  AGENT_MAX_ITERATIONS,
  HISTORY_MAX_TURNS,
  HISTORY_MAX_CHARS_PER_MESSAGE,
  GRAPH_EVENTS,
  MODEL_PRICING,
  DEFAULT_MODEL_PRICING,
} from "@/lib/config"

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
}

function createModel(fireworksKey: string) {
  return new ChatOpenAI({
    modelName: process.env.FIREWORKS_MODEL ?? DEFAULT_MODEL,
    openAIApiKey: fireworksKey,
    configuration: {
      baseURL: process.env.FIREWORKS_BASE_URL ?? FIREWORKS_BASE_URL,
      apiKey: fireworksKey,
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
  }
}

function* onModelStart(ctx: RunContext, runId: string): Generator<string> {
  ctx.modelStartTimes.set(runId, Date.now())
  yield encodeEvent({ type: STREAM_EVENT.MODEL_START, modelCallId: runId, label: MODEL_LABEL.REASONING })
}

function* onModelStream(ctx: RunContext, runId: string, data: unknown): Generator<string> {
  const chunk = (data as { chunk?: { content?: unknown; tool_call_chunks?: unknown[] } })?.chunk
  const content = chunk?.content
  const toolCallChunks = chunk?.tool_call_chunks ?? []
  if (typeof content === "string" && content.length > 0 && toolCallChunks.length === 0) {
    if (!ctx.modelHasTokens.has(runId)) {
      ctx.modelHasTokens.add(runId)
      ctx.firstTokenTime ??= Date.now()
      yield encodeEvent({ type: STREAM_EVENT.MODEL_START, modelCallId: runId, label: MODEL_LABEL.RESPONDING })
    }
    yield encodeEvent({ type: STREAM_EVENT.TOKEN_DELTA, content })
  }
}

function* onModelEnd(ctx: RunContext, runId: string, data: unknown): Generator<string> {
  const durationMs = Date.now() - (ctx.modelStartTimes.get(runId) ?? Date.now())
  ctx.modelStartTimes.delete(runId)
  ctx.modelHasTokens.delete(runId)
  const output = (data as { output?: { usage_metadata?: { input_tokens?: number; output_tokens?: number }; response_metadata?: { token_usage?: { prompt_tokens?: number; completion_tokens?: number } } } })?.output
  ctx.totalInputTokens += output?.usage_metadata?.input_tokens ?? output?.response_metadata?.token_usage?.prompt_tokens ?? 0
  ctx.totalOutputTokens += output?.usage_metadata?.output_tokens ?? output?.response_metadata?.token_usage?.completion_tokens ?? 0
  yield encodeEvent({ type: STREAM_EVENT.MODEL_END, modelCallId: runId, durationMs })
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
  })
}

export async function* runAgentStream(
  userMessage: string,
  history: { role: string; content: string }[] = [],
  keys: ApiKeys
): AsyncGenerator<string> {
  const graph = createAgent({
    model: createModel(keys.fireworksKey),
    tools: createTools(keys.tavilyKey),
    systemPrompt: AGENT_SYSTEM_PROMPT,
  })

  const modelId = process.env.FIREWORKS_MODEL ?? DEFAULT_MODEL
  const ctx = createRunContext(modelId)

  const historyMessages = trimHistory(history).map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  )

  const eventStream = graph.streamEvents(
    { messages: [...historyMessages, new HumanMessage(userMessage)] },
    { version: "v2", recursionLimit: AGENT_MAX_ITERATIONS * 2 + 2 }
  )

  for await (const event of eventStream) {
    const { event: eventName, name, data } = event
    const runId: string = event.run_id ?? `run-${ctx.stepIndex}`

    if (eventName === GRAPH_EVENTS.CHAT_MODEL_START) yield* onModelStart(ctx, runId)
    if (eventName === GRAPH_EVENTS.CHAT_MODEL_STREAM) yield* onModelStream(ctx, runId, data)
    if (eventName === GRAPH_EVENTS.CHAT_MODEL_END) yield* onModelEnd(ctx, runId, data)
    if (eventName === GRAPH_EVENTS.TOOL_START) yield* onToolStart(ctx, runId, name, data)
    if (eventName === GRAPH_EVENTS.TOOL_END) yield* onToolEnd(ctx, runId, name, data)
  }

  yield* buildDoneEvent(ctx)
}
