"use client"

import { useCallback, useEffect, useReducer, useRef } from "react"
import type { Message, TraceStep, ApiKeys, TokenUsage } from "@/lib/types"
import type { HistoryMessage } from "@/lib/api/chat"
import { TRACE_STATUS, STEP_TYPE } from "@/lib/types"
import { STREAM_EVENT, type StreamEvent } from "@/lib/streaming/types"
import { parseSSE } from "@/lib/streaming/utils"
import { streamChat } from "@/lib/api/chat"
import {
  STORAGE_KEY_MESSAGES,
  STORAGE_KEY_TRACE_STEPS,
  STORAGE_KEY_SESSION_USAGE,
  STORAGE_KEY_QUERY_USAGE,
} from "@/lib/config"

// ── Storage helpers ─────────────────────────────────────────────────────────

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStorage(key: string, value: unknown | null) {
  if (typeof window === "undefined") return
  if (value === null) sessionStorage.removeItem(key)
  else sessionStorage.setItem(key, JSON.stringify(value))
}

// ── State + reducer ───────────────────────────────────────────────────────────

const EMPTY_USAGE: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

interface AgentState {
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

type PersistedState = Pick<
  AgentState,
  "messages" | "traceSteps" | "queryUsage" | "queryCostUsd" | "sessionUsage" | "sessionCostUsd"
>

type Action =
  | { kind: "hydrate"; payload: PersistedState }
  | { kind: "send_start"; userId: string; assistantId: string; content: string }
  | { kind: "stream_event"; event: StreamEvent; assistantId: string }
  | { kind: "stream_settled"; assistantId: string }
  | { kind: "set_error"; message: string }
  | { kind: "clear_error" }
  | { kind: "clear_all" }

function emptyState(): AgentState {
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

function loadPersisted(): PersistedState {
  const query = readStorage<{ usage: TokenUsage; costUsd: number | null } | null>(
    STORAGE_KEY_QUERY_USAGE,
    null
  )
  const session = readStorage<{ usage: TokenUsage; costUsd: number } | null>(
    STORAGE_KEY_SESSION_USAGE,
    null
  )
  return {
    messages: readStorage<Message[]>(STORAGE_KEY_MESSAGES, []).map((m) => ({
      ...m,
      isStreaming: false,
    })),
    traceSteps: readStorage<TraceStep[]>(STORAGE_KEY_TRACE_STEPS, []),
    queryUsage: query?.usage ?? null,
    queryCostUsd: query?.costUsd ?? null,
    sessionUsage: session?.usage ?? EMPTY_USAGE,
    sessionCostUsd: session?.costUsd ?? 0,
  }
}

function applyStreamEvent(state: AgentState, event: StreamEvent, assistantId: string): AgentState {
  switch (event.type) {
    case STREAM_EVENT.TOKEN_DELTA:
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === assistantId ? { ...m, content: m.content + event.content } : m
        ),
      }

    case STREAM_EVENT.MODEL_START: {
      const existing = state.traceSteps.find((s) => s.id === event.modelCallId)
      // Relabel "Reasoning" → "Responding" once tokens start; otherwise add a new step.
      const traceSteps = existing
        ? state.traceSteps.map((s) =>
            s.id === event.modelCallId ? { ...s, toolName: event.label } : s
          )
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
        traceSteps: state.traceSteps.map((s) =>
          s.id === event.modelCallId
            ? {
                ...s,
                status: TRACE_STATUS.DONE,
                durationMs: event.durationMs,
                endedAt: Date.now(),
                reasoning: event.reasoning ?? s.reasoning,
              }
            : s
        ),
      }

    case STREAM_EVENT.MODERATION:
      return {
        ...state,
        messages: event.blocked
          ? state.messages.map((m) =>
              m.id === assistantId ? { ...m, content: event.reason } : m
            )
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
        traceSteps: state.traceSteps.map((s) =>
          s.id === event.toolCallId
            ? {
                ...s,
                result: event.result,
                durationMs: event.durationMs,
                status: TRACE_STATUS.DONE,
                endedAt: Date.now(),
              }
            : s
        ),
      }

    case STREAM_EVENT.DONE: {
      const messages = event.truncated
        ? state.messages.map((m) => (m.id === assistantId ? { ...m, truncated: true } : m))
        : state.messages

      const base = {
        ...state,
        messages,
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

function reducer(state: AgentState, action: Action): AgentState {
  switch (action.kind) {
    case "hydrate":
      return { ...state, ...action.payload, hydrated: true }

    case "send_start":
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

    case "stream_event":
      return applyStreamEvent(state, action.event, action.assistantId)

    case "stream_settled":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.assistantId ? { ...m, isStreaming: false } : m
        ),
        isStreaming: false,
      }

    case "set_error":
      return { ...state, error: action.message }

    case "clear_error":
      return { ...state, error: null }

    case "clear_all":
      return { ...emptyState(), hydrated: true }
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAgentStream(apiKeys?: ApiKeys | null) {
  const [state, dispatch] = useReducer(reducer, undefined, emptyState)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<Message[]>(state.messages)
  const apiKeysRef = useRef(apiKeys)

  useEffect(() => {
    messagesRef.current = state.messages
  }, [state.messages])
  useEffect(() => {
    apiKeysRef.current = apiKeys
  }, [apiKeys])

  // Hydrate from sessionStorage after mount so the first render matches SSR.
  useEffect(() => {
    dispatch({ kind: "hydrate", payload: loadPersisted() })
  }, [])

  // Single persistence sink — replaces four hand-written sync effects.
  // Skip until hydrated so the initial empty render can't clobber stored data.
  useEffect(() => {
    if (!state.hydrated) return
    writeStorage(STORAGE_KEY_MESSAGES, state.messages)
    writeStorage(STORAGE_KEY_TRACE_STEPS, state.traceSteps)
    writeStorage(
      STORAGE_KEY_QUERY_USAGE,
      state.queryUsage === null ? null : { usage: state.queryUsage, costUsd: state.queryCostUsd }
    )
    writeStorage(
      STORAGE_KEY_SESSION_USAGE,
      state.sessionUsage.totalTokens > 0
        ? { usage: state.sessionUsage, costUsd: state.sessionCostUsd }
        : null
    )
  }, [
    state.hydrated,
    state.messages,
    state.traceSteps,
    state.queryUsage,
    state.queryCostUsd,
    state.sessionUsage,
    state.sessionCostUsd,
  ])

  const sendMessage = useCallback(async (content: string) => {
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    const assistantId = crypto.randomUUID()

    const history: HistoryMessage[] = messagesRef.current
      .filter((m) => !m.isStreaming && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }))

    dispatch({ kind: "send_start", userId: crypto.randomUUID(), assistantId, content })

    try {
      const res = await streamChat(content, history, abort.signal, apiKeysRef.current ?? undefined)

      for await (const event of parseSSE(res)) {
        if (abort.signal.aborted) break
        dispatch({ kind: "stream_event", event, assistantId })
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        dispatch({
          kind: "set_error",
          message: err instanceof Error ? err.message : "Something went wrong",
        })
      }
    } finally {
      dispatch({ kind: "stream_settled", assistantId })
    }
  }, [])

  const clearMessages = useCallback(() => {
    abortRef.current?.abort()
    dispatch({ kind: "clear_all" })
  }, [])

  const clearError = useCallback(() => dispatch({ kind: "clear_error" }), [])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    messages: state.messages,
    traceSteps: state.traceSteps,
    isStreaming: state.isStreaming,
    totalLatencyMs: state.totalLatencyMs,
    ttftMs: state.ttftMs,
    queryUsage: state.queryUsage,
    queryCostUsd: state.queryCostUsd,
    sessionUsage: state.sessionUsage,
    sessionCostUsd: state.sessionCostUsd,
    error: state.error,
    sendMessage,
    clearMessages,
    clearError,
    stopStreaming,
  }
}
