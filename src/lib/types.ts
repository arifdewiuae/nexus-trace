export type MessageRole = "user" | "assistant"

export type Message = {
  id: string
  role: MessageRole
  content: string
  isStreaming?: boolean
}

export const TRACE_STATUS = {
  RUNNING: "running",
  DONE: "done",
  ERROR: "error",
} as const

export type TraceStepStatus = (typeof TRACE_STATUS)[keyof typeof TRACE_STATUS]

export type TraceStep = {
  id: string
  toolName: string
  args: unknown
  result?: unknown
  durationMs?: number
  status: TraceStepStatus
  startedAt: number
  endedAt?: number
}
