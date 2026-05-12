import { ChatOpenAI } from "@langchain/openai"
import { createReactAgent } from "@langchain/langgraph/prebuilt"
import { HumanMessage } from "@langchain/core/messages"
import { allTools } from "./tools"
import { AGENT_SYSTEM_PROMPT } from "./state"
import { type StreamEvent, encodeEvent } from "@/lib/streaming/types"

function createModel() {
  const apiKey = process.env.FIREWORKS_API_KEY
  if (!apiKey) throw new Error("FIREWORKS_API_KEY is not set")

  return new ChatOpenAI({
    modelName: "accounts/fireworks/models/qwen3p5-72b-instruct",
    openAIApiKey: apiKey,
    configuration: {
      baseURL: "https://api.fireworks.ai/inference/v1",
    },
    streaming: true,
    temperature: 0.6,
    maxTokens: 4096,
  })
}

export function createAgentGraph() {
  return createReactAgent({
    llm: createModel(),
    tools: allTools,
    prompt: AGENT_SYSTEM_PROMPT,
  })
}

export async function* runAgentStream(
  userMessage: string
): AsyncGenerator<string> {
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

    if (eventName === "on_chat_model_stream") {
      const chunk = data?.chunk
      const content = chunk?.content
      if (typeof content === "string" && content.length > 0) {
        const e: StreamEvent = { type: "token_delta", content }
        yield encodeEvent(e)
      }
    }

    if (eventName === "on_tool_start") {
      activeToolCallId = event.run_id ?? `tool-${stepIndex}`
      const e: StreamEvent = {
        type: "tool_start",
        toolName: name ?? "unknown",
        toolCallId: activeToolCallId,
        args: data?.input ?? {},
      }
      yield encodeEvent(e)
    }

    if (eventName === "on_tool_end") {
      const toolCallId = event.run_id ?? activeToolCallId ?? `tool-${stepIndex}`
      const e: StreamEvent = {
        type: "tool_result",
        toolName: name ?? "unknown",
        toolCallId,
        result: data?.output ?? null,
        durationMs: 0,
      }
      yield encodeEvent(e)
      stepIndex++
      const stepE: StreamEvent = { type: "step_end", stepIndex }
      yield encodeEvent(stepE)
      activeToolCallId = null
    }
  }

  const doneE: StreamEvent = {
    type: "done",
    totalSteps: stepIndex,
    latencyMs: Date.now() - startTime,
  }
  yield encodeEvent(doneE)
}
