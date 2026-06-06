import type { Message, TraceStep, TokenUsage } from "@/lib/types"
import {
  STORAGE_KEY_MESSAGES,
  STORAGE_KEY_TRACE_STEPS,
  STORAGE_KEY_SESSION_USAGE,
} from "@/lib/config"
import { EMPTY_USAGE, type AgentState, type PersistedState } from "./reducer"

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

// Read persisted conversation state from sessionStorage (post-mount, never during render).
export function loadPersisted(): PersistedState {
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
    sessionUsage: session?.usage ?? EMPTY_USAGE,
    sessionCostUsd: session?.costUsd ?? 0,
  }
}

// Single persistence sink — mirrors the live state back to sessionStorage.
export function persistState(state: AgentState) {
  writeStorage(STORAGE_KEY_MESSAGES, state.messages)
  writeStorage(STORAGE_KEY_TRACE_STEPS, state.traceSteps)
  writeStorage(
    STORAGE_KEY_SESSION_USAGE,
    state.sessionUsage.totalTokens > 0
      ? { usage: state.sessionUsage, costUsd: state.sessionCostUsd }
      : null
  )
}
