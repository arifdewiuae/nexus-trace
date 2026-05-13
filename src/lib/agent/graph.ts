import { ChatOpenAI } from "@langchain/openai"
import { createAgent } from "langchain"
import { AIMessage, HumanMessage } from "@langchain/core/messages"
import { createTools } from "./tools"
import { AGENT_SYSTEM_PROMPT } from "./state"
import { type StreamEvent, STREAM_EVENT, encodeEvent } from "@/lib/streaming/types"
import { MODEL_LABEL, type ApiKeys } from "@/lib/types"
import {
  FIREWORKS_BASE_URL,
  DEFAULT_MODEL,
  AGENT_TEMPERATURE,
  AGENT_MAX_TOKENS,
  AGENT_MAX_ITERATIONS,
  GRAPH_EVENTS,
  MODEL_PRICING,
  DEFAULT_MODEL_PRICING,
} from "@/lib/config"

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

function extractToolResult(output: unknown): unknown {
  if (output && typeof output === "object" && "kwargs" in output) {
    return (output as { kwargs: { content?: unknown } }).kwargs.content ?? output
  }
  return output
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
  const pricing = MODEL_PRICING[modelId] ?? DEFAULT_MODEL_PRICING

  const startTime = Date.now()
  let stepIndex = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  const toolStartTimes = new Map<string, number>()
  const modelStartTimes = new Map<string, number>()

  const historyMessages = history.map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  )

  const recursionLimit = AGENT_MAX_ITERATIONS * 2 + 2
  const eventStream = graph.streamEvents(
    { messages: [...historyMessages, new HumanMessage(userMessage)] },
    { version: "v2", recursionLimit }
  )

  const modelHasTokens = new Set<string>()

  for await (const event of eventStream) {
    const { event: eventName, name, data } = event
    const runId: string = event.run_id ?? `run-${stepIndex}`

    if (eventName === GRAPH_EVENTS.CHAT_MODEL_START) {
      modelStartTimes.set(runId, Date.now())
      yield encodeEvent({ type: STREAM_EVENT.MODEL_START, modelCallId: runId, label: MODEL_LABEL.REASONING })
    }

    if (eventName === GRAPH_EVENTS.CHAT_MODEL_STREAM) {
      const chunk = data?.chunk
      const content = chunk?.content
      const toolCallChunks: unknown[] = chunk?.tool_call_chunks ?? []
      if (typeof content === "string" && content.length > 0 && toolCallChunks.length === 0) {
        if (!modelHasTokens.has(runId)) {
          modelHasTokens.add(runId)
          yield encodeEvent({
            type: STREAM_EVENT.MODEL_START,
            modelCallId: runId,
            label: MODEL_LABEL.RESPONDING,
          })
        }
        yield encodeEvent({ type: STREAM_EVENT.TOKEN_DELTA, content })
      }
    }

    if (eventName === GRAPH_EVENTS.CHAT_MODEL_END) {
      const durationMs = Date.now() - (modelStartTimes.get(runId) ?? Date.now())
      modelStartTimes.delete(runId)
      modelHasTokens.delete(runId)

      // Extract token usage — LangChain Core uses usage_metadata; OpenAI compat uses token_usage
      const meta = data?.output?.usage_metadata
      const compat = data?.output?.response_metadata?.token_usage
      totalInputTokens += meta?.input_tokens ?? compat?.prompt_tokens ?? 0
      totalOutputTokens += meta?.output_tokens ?? compat?.completion_tokens ?? 0

      yield encodeEvent({ type: STREAM_EVENT.MODEL_END, modelCallId: runId, durationMs })
    }

    if (eventName === GRAPH_EVENTS.TOOL_START) {
      toolStartTimes.set(runId, Date.now())
      yield encodeEvent({
        type: STREAM_EVENT.TOOL_START,
        toolName: name ?? "unknown",
        toolCallId: runId,
        args: data?.input ?? {},
      })
    }

    if (eventName === GRAPH_EVENTS.TOOL_END) {
      const durationMs = Date.now() - (toolStartTimes.get(runId) ?? Date.now())
      toolStartTimes.delete(runId)
      yield encodeEvent({
        type: STREAM_EVENT.TOOL_RESULT,
        toolName: name ?? "unknown",
        toolCallId: runId,
        result: extractToolResult(data?.output),
        durationMs,
      })
      stepIndex++
      yield encodeEvent({ type: STREAM_EVENT.STEP_END, stepIndex })
    }
  }

  const hasUsage = totalInputTokens + totalOutputTokens > 0
  const estimatedCostUsd = hasUsage
    ? (totalInputTokens * pricing.inputPer1M + totalOutputTokens * pricing.outputPer1M) / 1_000_000
    : undefined

  yield encodeEvent({
    type: STREAM_EVENT.DONE,
    totalSteps: stepIndex,
    latencyMs: Date.now() - startTime,
    inputTokens: hasUsage ? totalInputTokens : undefined,
    outputTokens: hasUsage ? totalOutputTokens : undefined,
    estimatedCostUsd,
  })
}
