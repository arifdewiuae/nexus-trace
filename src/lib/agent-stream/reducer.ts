import type { Message, TraceStep, TokenUsage } from "@/lib/types"
import { TRACE_STATUS, STEP_TYPE } from "@/lib/types"
import { STREAM_EVENT, type StreamEvent } from "@/lib/streaming/types"

// ── Action types ──────────────────────────────────────────────────────────────

export const AGENT_ACTION = {
  HYDRATE: "hydrate",
  SEND_START: "send_start",
  STREAM_EVENT: "stream_event",
  STREAM_SETTLED: "stream_settled",
  SET_ERROR: "set_error",
  CLEAR_ERROR: "clear_error",
  CLEAR_ALL: "clear_all",
} as const

export type Action =
  | { kind: typeof AGENT_ACTION.HYDRATE; payload: PersistedState }
  | { kind: typeof AGENT_ACTION.SEND_START; userId: string; assistantId: string; content: string }
  | { kind: typeof AGENT_ACTION.STREAM_EVENT; event: StreamEvent; assistantId: string }
  | { kind: typeof AGENT_ACTION.STREAM_SETTLED; assistantId: string }
  | { kind: typeof AGENT_ACTION.SET_ERROR; message: string }
  | { kind: typeof AGENT_ACTION.CLEAR_ERROR }
  | { kind: typeof AGENT_ACTION.CLEAR_ALL }

// ── State ───────────────────────────────────────────────────────────────────────

export const EMPTY_USAGE: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

export interface AgentState {
  messages: Message[]
  traceSteps: TraceStep[]
  isStreaming: boolean
  totalLatencyMs: number | null
  ttftMs: number | null
  queryUsage: TokenUsage | null
  queryCostUsd: number | null
  sessionUsage: TokenUsage
  sessionCostUsd: number
  error: string | null
  // False until the post-mount hydrate runs. Persisted state is intentionally
  // NOT read during render so the first client render matches SSR (empty),
  // avoiding a hydration mismatch.
  hydrated: boolean
}

export type PersistedState = Pick<
  AgentState,
  "messages" | "traceSteps" | "queryUsage" | "queryCostUsd" | "sessionUsage" | "sessionCostUsd"
>

export function emptyState(): AgentState {
  return {
    messages: [],
    traceSteps: [],
    isStreaming: false,
    totalLatencyMs: null,
    ttftMs: null,
    queryUsage: null,
    queryCostUsd: null,
    sessionUsage: EMPTY_USAGE,
    sessionCostUsd: 0,
    error: null,
    hydrated: false,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Immutably patch the one item matching `id`, leaving the others referentially stable
// (so memoized children that didn't change skip re-rendering).
function patchById<T extends { id: string }>(
  items: T[],
  id: string,
  patch: Partial<T> | ((item: T) => Partial<T>)
): T[] {
  return items.map((item) =>
    item.id === id
      ? { ...item, ...(typeof patch === "function" ? patch(item) : patch) }
      : item
  )
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function applyStreamEvent(state: AgentState, event: StreamEvent, assistantId: string): AgentState {
  switch (event.type) {
    case STREAM_EVENT.TOKEN_DELTA:
      return {
        ...state,
        messages: patchById(state.messages, assistantId, (m) => ({
          content: m.content + event.content,
        })),
      }

    case STREAM_EVENT.MODEL_START: {
      const exists = state.traceSteps.some((s) => s.id === event.modelCallId)
      // Relabel "Reasoning" → "Responding" once tokens start; otherwise add a new step.
      const traceSteps = exists
        ? patchById(state.traceSteps, event.modelCallId, { toolName: event.label })
        : [
            ...state.traceSteps,
            {
              id: event.modelCallId,
              stepType: STEP_TYPE.MODEL,
              toolName: event.label,
              status: TRACE_STATUS.RUNNING,
              startedAt: Date.now(),
            },
          ]
      return { ...state, traceSteps }
    }

    case STREAM_EVENT.MODEL_END:
      return {
        ...state,
        traceSteps: patchById(state.traceSteps, event.modelCallId, (s) => ({
          status: TRACE_STATUS.DONE,
          durationMs: event.durationMs,
          endedAt: Date.now(),
          reasoning: event.reasoning ?? s.reasoning,
        })),
      }

    case STREAM_EVENT.MODERATION:
      return {
        ...state,
        messages: event.blocked
          ? patchById(state.messages, assistantId, { content: event.reason })
          : state.messages,
        traceSteps: [
          ...state.traceSteps,
          {
            id: `moderation-${assistantId}`,
            stepType: STEP_TYPE.TOOL,
            toolName: "content_check",
            status: event.blocked ? TRACE_STATUS.ERROR : TRACE_STATUS.DONE,
            durationMs: event.durationMs,
            startedAt: Date.now() - event.durationMs,
            endedAt: Date.now(),
          },
        ],
      }

    case STREAM_EVENT.TOOL_START:
      return {
        ...state,
        traceSteps: [
          ...state.traceSteps,
          {
            id: event.toolCallId,
            stepType: STEP_TYPE.TOOL,
            toolName: event.toolName,
            args: event.args,
            status: TRACE_STATUS.RUNNING,
            startedAt: Date.now(),
          },
        ],
      }

    case STREAM_EVENT.TOOL_RESULT:
      return {
        ...state,
        traceSteps: patchById(state.traceSteps, event.toolCallId, {
          result: event.result,
          durationMs: event.durationMs,
          status: TRACE_STATUS.DONE,
          endedAt: Date.now(),
        }),
      }

    case STREAM_EVENT.DONE: {
      const base = {
        ...state,
        messages: event.truncated
          ? patchById(state.messages, assistantId, { truncated: true })
          : state.messages,
        totalLatencyMs: event.latencyMs,
        ttftMs: event.ttftMs ?? null,
      }
      if (event.inputTokens == null || event.outputTokens == null) return base

      const usage: TokenUsage = {
        inputTokens: event.inputTokens,
        outputTokens: event.outputTokens,
        totalTokens: event.inputTokens + event.outputTokens,
      }
      const cost = event.estimatedCostUsd ?? null

      return {
        ...base,
        queryUsage: usage,
        queryCostUsd: cost,
        sessionUsage: {
          inputTokens: state.sessionUsage.inputTokens + usage.inputTokens,
          outputTokens: state.sessionUsage.outputTokens + usage.outputTokens,
          totalTokens: state.sessionUsage.totalTokens + usage.totalTokens,
        },
        sessionCostUsd: state.sessionCostUsd + (cost ?? 0),
      }
    }

    case STREAM_EVENT.ERROR:
      return { ...state, error: event.message }

    case STREAM_EVENT.STEP_END:
      return state
  }
}

export function reducer(state: AgentState, action: Action): AgentState {
  switch (action.kind) {
    case AGENT_ACTION.HYDRATE:
      return { ...state, ...action.payload, hydrated: true }

    case AGENT_ACTION.SEND_START:
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: action.userId, role: "user", content: action.content },
          { id: action.assistantId, role: "assistant", content: "", isStreaming: true },
        ],
        traceSteps:
          state.traceSteps.length > 0
            ? [
                ...state.traceSteps,
                {
                  id: crypto.randomUUID(),
                  stepType: STEP_TYPE.DIVIDER,
                  toolName: "",
                  status: TRACE_STATUS.DONE,
                  startedAt: Date.now(),
                },
              ]
            : state.traceSteps,
        isStreaming: true,
        totalLatencyMs: null,
        ttftMs: null,
        queryUsage: null,
        queryCostUsd: null,
        error: null,
      }

    case AGENT_ACTION.STREAM_EVENT:
      return applyStreamEvent(state, action.event, action.assistantId)

    case AGENT_ACTION.STREAM_SETTLED:
      return {
        ...state,
        messages: patchById(state.messages, action.assistantId, { isStreaming: false }),
        isStreaming: false,
      }

    case AGENT_ACTION.SET_ERROR:
      return { ...state, error: action.message }

    case AGENT_ACTION.CLEAR_ERROR:
      return { ...state, error: null }

    case AGENT_ACTION.CLEAR_ALL:
      return { ...emptyState(), hydrated: true }
  }
}
