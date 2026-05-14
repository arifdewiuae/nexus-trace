export type ApiKeys = {
  fireworksKey: string
  tavilyKey: string
  openaiKey?: string
}

export type TokenUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

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

export const STEP_TYPE = {
  TOOL: "tool",
  MODEL: "model",
  DIVIDER: "divider",
} as const

export const MODEL_LABEL = {
  REASONING: "Reasoning",
  RESPONDING: "Responding",
} as const

export type StepType = (typeof STEP_TYPE)[keyof typeof STEP_TYPE]

export type TraceStep = {
  id: string
  stepType: StepType
  toolName: string
  args?: unknown
  result?: unknown
  durationMs?: number
  status: TraceStepStatus
  startedAt: number
  endedAt?: number
}
