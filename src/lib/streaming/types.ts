export const STREAM_EVENT = {
  TOKEN_DELTA: "token_delta",
  MODEL_START: "model_start",
  MODEL_END: "model_end",
  TOOL_START: "tool_start",
  TOOL_RESULT: "tool_result",
  STEP_END: "step_end",
  MODERATION: "moderation",
  DONE: "done",
  ERROR: "error",
} as const

export type StreamEventType = (typeof STREAM_EVENT)[keyof typeof STREAM_EVENT]

export type StreamEvent =
  | { type: typeof STREAM_EVENT.TOKEN_DELTA; content: string }
  | { type: typeof STREAM_EVENT.MODEL_START; modelCallId: string; label: string }
  | { type: typeof STREAM_EVENT.MODEL_END; modelCallId: string; durationMs: number }
  | { type: typeof STREAM_EVENT.TOOL_START; toolName: string; toolCallId: string; args: unknown }
  | {
      type: typeof STREAM_EVENT.TOOL_RESULT
      toolName: string
      toolCallId: string
      result: unknown
      durationMs: number
    }
  | { type: typeof STREAM_EVENT.STEP_END; stepIndex: number }
  | { type: typeof STREAM_EVENT.MODERATION; durationMs: number; blocked: false }
  | { type: typeof STREAM_EVENT.MODERATION; durationMs: number; blocked: true; reason: string }
  | {
      type: typeof STREAM_EVENT.DONE
      totalSteps: number
      latencyMs: number
      ttftMs?: number
      inputTokens?: number
      outputTokens?: number
      estimatedCostUsd?: number
    }
  | { type: typeof STREAM_EVENT.ERROR; message: string }

export function encodeEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}
