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

export type TokenDeltaEvent = { type: typeof STREAM_EVENT.TOKEN_DELTA; content: string }
export type ModelStartEvent = { type: typeof STREAM_EVENT.MODEL_START; modelCallId: string; label: string }
export type ModelEndEvent = {
  type: typeof STREAM_EVENT.MODEL_END
  modelCallId: string
  durationMs: number
  // The model's reasoning_content for this call, if it emitted any. Shown in the trace only.
  reasoning?: string
}
export type ToolStartEvent = {
  type: typeof STREAM_EVENT.TOOL_START
  toolName: string
  toolCallId: string
  args: unknown
}
export type ToolResultEvent = {
  type: typeof STREAM_EVENT.TOOL_RESULT
  toolName: string
  toolCallId: string
  result: unknown
  durationMs: number
}
export type StepEndEvent = { type: typeof STREAM_EVENT.STEP_END; stepIndex: number }

export type ModerationEvent =
  | { type: typeof STREAM_EVENT.MODERATION; durationMs: number; blocked: false }
  | { type: typeof STREAM_EVENT.MODERATION; durationMs: number; blocked: true; reason: string }

export type DoneEvent = {
  type: typeof STREAM_EVENT.DONE
  totalSteps: number
  latencyMs: number
  ttftMs?: number
  inputTokens?: number
  outputTokens?: number
  estimatedCostUsd?: number
  // True when the model hit its output-token cap (finish_reason "length") — the reply is cut off.
  truncated?: boolean
}
export type ErrorEvent = { type: typeof STREAM_EVENT.ERROR; message: string }

export type StreamEvent =
  | TokenDeltaEvent
  | ModelStartEvent
  | ModelEndEvent
  | ToolStartEvent
  | ToolResultEvent
  | StepEndEvent
  | ModerationEvent
  | DoneEvent
  | ErrorEvent

export function encodeEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}
