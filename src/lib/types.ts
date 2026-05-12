export type MessageRole = "user" | "assistant"

export type Message = {
  id: string
  role: MessageRole
  content: string
  isStreaming?: boolean
}

export type TraceStepStatus = "running" | "done" | "error"

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
