import { ChatOpenAI } from "@langchain/openai"
import { createAgent } from "langchain"
import { HumanMessage } from "@langchain/core/messages"
import { allTools } from "./tools"
import { AGENT_SYSTEM_PROMPT } from "./state"
import { type StreamEvent, STREAM_EVENT, encodeEvent } from "@/lib/streaming/types"
import {
  FIREWORKS_BASE_URL,
  DEFAULT_MODEL,
  AGENT_TEMPERATURE,
  AGENT_MAX_TOKENS,
  GRAPH_EVENTS,
} from "@/lib/config"

function createModel() {
  const apiKey = process.env.FIREWORKS_API_KEY
  if (!apiKey) throw new Error("FIREWORKS_API_KEY is not set")

  return new ChatOpenAI({
    modelName: process.env.FIREWORKS_MODEL ?? DEFAULT_MODEL,
    openAIApiKey: apiKey,
    configuration: {
      baseURL: process.env.FIREWORKS_BASE_URL ?? FIREWORKS_BASE_URL,
    },
    streaming: true,
    temperature: AGENT_TEMPERATURE,
    maxTokens: AGENT_MAX_TOKENS,
  })
}

export function createAgentGraph() {
  return createAgent({
    model: createModel(),
    tools: allTools,
    systemPrompt: AGENT_SYSTEM_PROMPT,
  })
}

export async function* runAgentStream(userMessage: string): AsyncGenerator<string> {
  const graph = createAgentGraph()
  const startTime = Date.now()
  let stepIndex = 0
  let activeToolCallId: string | null = null

  const eventStream = graph.streamEvents(
    { messages: [new HumanMessage(userMessage)] },
    { version: "v2" }
  )

  for await (const event of eventStream) {
    const { event: eventName, name, data } = event

    if (eventName === GRAPH_EVENTS.CHAT_MODEL_STREAM) {
      const chunk = data?.chunk
      const content = chunk?.content
      if (typeof content === "string" && content.length > 0) {
        const e: StreamEvent = { type: STREAM_EVENT.TOKEN_DELTA, content }
        yield encodeEvent(e)
      }
    }

    if (eventName === GRAPH_EVENTS.TOOL_START) {
      activeToolCallId = event.run_id ?? `tool-${stepIndex}`
      const e: StreamEvent = {
        type: STREAM_EVENT.TOOL_START,
        toolName: name ?? "unknown",
        toolCallId: activeToolCallId,
        args: data?.input ?? {},
      }
      yield encodeEvent(e)
    }

    if (eventName === GRAPH_EVENTS.TOOL_END) {
      const toolCallId = event.run_id ?? activeToolCallId ?? `tool-${stepIndex}`
      const e: StreamEvent = {
        type: STREAM_EVENT.TOOL_RESULT,
        toolName: name ?? "unknown",
        toolCallId,
        result: data?.output ?? null,
        durationMs: 0,
      }
      yield encodeEvent(e)
      stepIndex++
      yield encodeEvent({ type: STREAM_EVENT.STEP_END, stepIndex })
      activeToolCallId = null
    }
  }

  yield encodeEvent({
    type: STREAM_EVENT.DONE,
    totalSteps: stepIndex,
    latencyMs: Date.now() - startTime,
  })
}
