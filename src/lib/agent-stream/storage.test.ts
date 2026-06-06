import { describe, it, expect, beforeEach } from "vitest"
import type { TokenUsage } from "@/lib/types"
import { MESSAGE_ROLE, STEP_TYPE, TRACE_STATUS } from "@/lib/types"
import { STORAGE_KEY_SESSION_USAGE } from "@/lib/config"
import { emptyState, type AgentState } from "./reducer"
import { loadPersisted, persistState } from "./storage"

function stateWith(overrides: Partial<AgentState>): AgentState {
  return { ...emptyState(), hydrated: true, ...overrides }
}

const USAGE: TokenUsage = { inputTokens: 1, outputTokens: 2, totalTokens: 3 }

describe("agent-stream storage", () => {
  beforeEach(() => sessionStorage.clear())

  it("returns empty defaults when nothing is stored", () => {
    const p = loadPersisted()
    expect(p.messages).toEqual([])
    expect(p.traceSteps).toEqual([])
    expect(p.sessionUsage).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 })
    expect(p.sessionCostUsd).toBe(0)
  })

  it("round-trips messages and trace steps", () => {
    persistState(
      stateWith({
        messages: [{ id: "m", role: MESSAGE_ROLE.USER, content: "hi" }],
        traceSteps: [
          {
            id: "s",
            stepType: STEP_TYPE.TOOL,
            toolName: "web_search",
            status: TRACE_STATUS.DONE,
            startedAt: 1,
          },
        ],
      })
    )
    const p = loadPersisted()
    expect(p.messages).toEqual([{ id: "m", role: MESSAGE_ROLE.USER, content: "hi", isStreaming: false }])
    expect(p.traceSteps).toHaveLength(1)
  })

  it("resets isStreaming to false on load", () => {
    persistState(
      stateWith({
        messages: [{ id: "m", role: MESSAGE_ROLE.ASSISTANT, content: "x", isStreaming: true }],
      })
    )
    expect(loadPersisted().messages[0].isStreaming).toBe(false)
  })

  it("does not persist session usage when there are zero tokens", () => {
    persistState(stateWith({}))
    expect(sessionStorage.getItem(STORAGE_KEY_SESSION_USAGE)).toBeNull()
  })

  it("persists and restores session usage when tokens are present", () => {
    persistState(stateWith({ sessionUsage: USAGE, sessionCostUsd: 0.5 }))
    const restored = loadPersisted()
    expect(restored.sessionUsage).toEqual(USAGE)
    expect(restored.sessionCostUsd).toBe(0.5)
  })
})
