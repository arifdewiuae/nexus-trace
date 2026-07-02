import { describe, it, expect } from "vitest"
import { STREAM_EVENT, type StreamEvent } from "@/lib/streaming/types"
import { TRACE_STATUS, STEP_TYPE, MESSAGE_ROLE } from "@/lib/types"
import { patchById, reducer, emptyState, AGENT_ACTION } from "./reducer"

type Item = { id: string; n: number; label?: string }

const items: Item[] = [
  { id: "a", n: 1 },
  { id: "b", n: 2 },
  { id: "c", n: 3 },
]

describe("patchById", () => {
  it("applies an object patch to the matching item only", () => {
    const result = patchById(items, "b", { n: 20, label: "hit" })
    expect(result).toEqual([
      { id: "a", n: 1 },
      { id: "b", n: 20, label: "hit" },
      { id: "c", n: 3 },
    ])
  })

  it("applies a function patch derived from the current item", () => {
    const result = patchById(items, "c", (item) => ({ n: item.n + 100 }))
    expect(result.find((i) => i.id === "c")?.n).toBe(103)
  })

  it("keeps non-matching items referentially stable (enables memoization)", () => {
    const result = patchById(items, "b", { n: 99 })
    expect(result[0]).toBe(items[0]) // untouched → same reference
    expect(result[2]).toBe(items[2])
    expect(result[1]).not.toBe(items[1]) // patched → new reference
  })

  it("returns a new array without mutating the input", () => {
    const result = patchById(items, "a", { n: 0 })
    expect(result).not.toBe(items)
    expect(items[0]).toEqual({ id: "a", n: 1 }) // original untouched
  })

  it("is a no-op (new array, same items) when no id matches", () => {
    const result = patchById(items, "missing", { n: 0 })
    expect(result).not.toBe(items)
    expect(result).toEqual(items)
    result.forEach((item, i) => expect(item).toBe(items[i]))
  })
})

describe("reducer", () => {
  const USER = "user-1"
  const ASSISTANT = "assistant-1"

  const dispatch = reducer
  const evt = (event: StreamEvent) =>
    ({ kind: AGENT_ACTION.STREAM_EVENT, assistantId: ASSISTANT, event }) as const

  function started() {
    return reducer(emptyState(), {
      kind: AGENT_ACTION.SEND_START,
      userId: USER,
      assistantId: ASSISTANT,
      content: "hello",
    })
  }

  it("send_start appends a user message and a streaming assistant placeholder", () => {
    const s = started()
    expect(s.messages).toEqual([
      { id: USER, role: MESSAGE_ROLE.USER, content: "hello" },
      { id: ASSISTANT, role: MESSAGE_ROLE.ASSISTANT, content: "", isStreaming: true },
    ])
    expect(s.isStreaming).toBe(true)
  })

  it("token_delta appends content to the assistant message only", () => {
    let s = started()
    s = dispatch(s, evt({ type: STREAM_EVENT.TOKEN_DELTA, content: "Hi" }))
    s = dispatch(s, evt({ type: STREAM_EVENT.TOKEN_DELTA, content: " there" }))
    expect(s.messages.find((m) => m.id === ASSISTANT)?.content).toBe("Hi there")
    expect(s.messages.find((m) => m.id === USER)?.content).toBe("hello")
  })

  it("token_delta strips leading whitespace but keeps internal newlines", () => {
    let s = started()
    // Model emits leading blank lines before the first real token.
    s = dispatch(s, evt({ type: STREAM_EVENT.TOKEN_DELTA, content: "\n\n" }))
    expect(s.messages.find((m) => m.id === ASSISTANT)?.content).toBe("") // stays empty → loading dots
    s = dispatch(s, evt({ type: STREAM_EVENT.TOKEN_DELTA, content: "Line 1\nLine 2" }))
    expect(s.messages.find((m) => m.id === ASSISTANT)?.content).toBe("Line 1\nLine 2")
  })

  it("model_start adds a step, then relabels it instead of duplicating", () => {
    let s = started()
    s = dispatch(s, evt({ type: STREAM_EVENT.MODEL_START, modelCallId: "m1", label: "Reasoning" }))
    expect(s.traceSteps).toHaveLength(1)
    expect(s.traceSteps[0]).toMatchObject({ id: "m1", toolName: "Reasoning", stepType: STEP_TYPE.MODEL })
    s = dispatch(s, evt({ type: STREAM_EVENT.MODEL_START, modelCallId: "m1", label: "Responding" }))
    expect(s.traceSteps).toHaveLength(1)
    expect(s.traceSteps[0].toolName).toBe("Responding")
  })

  it("tool_start then tool_result fills the same step", () => {
    let s = started()
    s = dispatch(s, evt({ type: STREAM_EVENT.TOOL_START, toolCallId: "t1", toolName: "web_search", args: { q: "x" } }))
    expect(s.traceSteps[0]).toMatchObject({ id: "t1", status: TRACE_STATUS.RUNNING })
    s = dispatch(s, evt({ type: STREAM_EVENT.TOOL_RESULT, toolCallId: "t1", toolName: "web_search", result: "ok", durationMs: 5 }))
    expect(s.traceSteps[0]).toMatchObject({ id: "t1", status: TRACE_STATUS.DONE, result: "ok", durationMs: 5 })
  })

  it("model_end marks the step done and attaches reasoning", () => {
    let s = started()
    s = dispatch(s, evt({ type: STREAM_EVENT.MODEL_START, modelCallId: "m1", label: "Reasoning" }))
    s = dispatch(s, evt({ type: STREAM_EVENT.MODEL_END, modelCallId: "m1", durationMs: 9, reasoning: "thinking…" }))
    expect(s.traceSteps[0]).toMatchObject({ status: TRACE_STATUS.DONE, durationMs: 9, reasoning: "thinking…" })
  })

  it("done aggregates usage into the session totals", () => {
    let s = started()
    s = dispatch(s, evt({ type: STREAM_EVENT.DONE, totalSteps: 1, latencyMs: 100, inputTokens: 10, outputTokens: 5, estimatedCostUsd: 0.001 }))
    expect(s.sessionUsage).toEqual({ inputTokens: 10, outputTokens: 5, totalTokens: 15 })
    expect(s.sessionCostUsd).toBeCloseTo(0.001)
    expect(s.totalLatencyMs).toBe(100)
  })

  it("done marks the assistant message truncated when the cap was hit", () => {
    let s = started()
    s = dispatch(s, evt({ type: STREAM_EVENT.DONE, totalSteps: 1, latencyMs: 10, truncated: true }))
    expect(s.messages.find((m) => m.id === ASSISTANT)?.truncated).toBe(true)
  })

  it("blocked moderation replaces the assistant content and records an error step", () => {
    let s = started()
    s = dispatch(s, evt({ type: STREAM_EVENT.MODERATION, blocked: true, reason: "nope", durationMs: 2 }))
    expect(s.messages.find((m) => m.id === ASSISTANT)?.content).toBe("nope")
    expect(s.traceSteps.find((t) => t.id === `moderation-${ASSISTANT}`)?.status).toBe(TRACE_STATUS.ERROR)
  })

  it("stream_settled clears the streaming flags", () => {
    let s = started()
    s = reducer(s, { kind: AGENT_ACTION.STREAM_SETTLED, assistantId: ASSISTANT })
    expect(s.isStreaming).toBe(false)
    expect(s.messages.find((m) => m.id === ASSISTANT)?.isStreaming).toBe(false)
  })

  it("clear_all resets to an empty, hydrated state", () => {
    let s = started()
    s = reducer(s, { kind: AGENT_ACTION.CLEAR_ALL })
    expect(s.messages).toEqual([])
    expect(s.traceSteps).toEqual([])
    expect(s.hydrated).toBe(true)
  })
})
