export type StreamEvent =
  | { type: "token_delta"; content: string }
  | { type: "tool_start"; toolName: string; toolCallId: string; args: unknown }
  | { type: "tool_result"; toolName: string; toolCallId: string; result: unknown; durationMs: number }
  | { type: "step_end"; stepIndex: number }
  | { type: "done"; totalSteps: number; latencyMs: number }
  | { type: "error"; message: string }

export function encodeEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}
