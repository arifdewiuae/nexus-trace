import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useAgentStream } from "./useAgentStream"
import { encodeEvent, STREAM_EVENT } from "@/lib/streaming/types"
import { TRACE_STATUS, STEP_TYPE } from "@/lib/types"

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStreamResponse(...events: Parameters<typeof encodeEvent>[0][]): Response {
  const body = events.map(encodeEvent).join("")
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      ctrl.enqueue(encoder.encode(body))
      ctrl.close()
    },
  })
  return new Response(stream, { status: 200 })
}

// Mock the API layer — keeps tests isolated from network
vi.mock("@/lib/api/chat", () => ({
  streamChat: vi.fn(),
}))

import { streamChat } from "@/lib/api/chat"
const mockedStreamChat = vi.mocked(streamChat)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useAgentStream", () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it("starts with empty state", () => {
    const { result } = renderHook(() => useAgentStream())
    expect(result.current.messages).toEqual([])
    expect(result.current.traceSteps).toEqual([])
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.totalLatencyMs).toBeNull()
  })

  it("adds user and assistant messages on sendMessage", async () => {
    mockedStreamChat.mockResolvedValue(
      makeStreamResponse(
        { type: STREAM_EVENT.TOKEN_DELTA, content: "Hello!" },
        { type: STREAM_EVENT.DONE, totalSteps: 0, latencyMs: 200 }
      )
    )

    const { result } = renderHook(() => useAgentStream())

    await act(async () => {
      await result.current.sendMessage("Hi")
    })

    const msgs = result.current.messages
    expect(msgs).toHaveLength(2)
    expect(msgs[0]).toMatchObject({ role: "user", content: "Hi" })
    expect(msgs[1]).toMatchObject({ role: "assistant", content: "Hello!", isStreaming: false })
  })

  it("accumulates TOKEN_DELTA into assistant message", async () => {
    mockedStreamChat.mockResolvedValue(
      makeStreamResponse(
        { type: STREAM_EVENT.TOKEN_DELTA, content: "Hel" },
        { type: STREAM_EVENT.TOKEN_DELTA, content: "lo" },
        { type: STREAM_EVENT.TOKEN_DELTA, content: "!" },
        { type: STREAM_EVENT.DONE, totalSteps: 0, latencyMs: 100 }
      )
    )

    const { result } = renderHook(() => useAgentStream())
    await act(async () => { await result.current.sendMessage("test") })

    expect(result.current.messages[1].content).toBe("Hello!")
  })

  it("creates and completes a TOOL trace step", async () => {
    mockedStreamChat.mockResolvedValue(
      makeStreamResponse(
        { type: STREAM_EVENT.TOOL_START, toolName: "web_search", toolCallId: "tc1", args: { query: "q" } },
        { type: STREAM_EVENT.TOOL_RESULT, toolName: "web_search", toolCallId: "tc1", result: "results", durationMs: 80 },
        { type: STREAM_EVENT.DONE, totalSteps: 1, latencyMs: 300 }
      )
    )

    const { result } = renderHook(() => useAgentStream())
    await act(async () => { await result.current.sendMessage("search for x") })

    expect(result.current.traceSteps).toHaveLength(1)
    const step = result.current.traceSteps[0]
    expect(step.stepType).toBe(STEP_TYPE.TOOL)
    expect(step.toolName).toBe("web_search")
    expect(step.status).toBe(TRACE_STATUS.DONE)
    expect(step.durationMs).toBe(80)
  })

  it("creates and completes a MODEL trace step", async () => {
    mockedStreamChat.mockResolvedValue(
      makeStreamResponse(
        { type: STREAM_EVENT.MODEL_START, modelCallId: "mc1", label: "Reasoning" },
        { type: STREAM_EVENT.MODEL_END, modelCallId: "mc1", durationMs: 150 },
        { type: STREAM_EVENT.DONE, totalSteps: 1, latencyMs: 400 }
      )
    )

    const { result } = renderHook(() => useAgentStream())
    await act(async () => { await result.current.sendMessage("think") })

    const step = result.current.traceSteps[0]
    expect(step.stepType).toBe(STEP_TYPE.MODEL)
    expect(step.status).toBe(TRACE_STATUS.DONE)
    expect(step.durationMs).toBe(150)
  })

  it("relabels MODEL step from Reasoning to Responding on first token", async () => {
    mockedStreamChat.mockResolvedValue(
      makeStreamResponse(
        { type: STREAM_EVENT.MODEL_START, modelCallId: "mc1", label: "Reasoning" },
        { type: STREAM_EVENT.MODEL_START, modelCallId: "mc1", label: "Responding" },
        { type: STREAM_EVENT.DONE, totalSteps: 1, latencyMs: 100 }
      )
    )

    const { result } = renderHook(() => useAgentStream())
    await act(async () => { await result.current.sendMessage("relabel") })

    expect(result.current.traceSteps[0].toolName).toBe("Responding")
    expect(result.current.traceSteps).toHaveLength(1)
  })

  it("sets totalLatencyMs from DONE event", async () => {
    mockedStreamChat.mockResolvedValue(
      makeStreamResponse({ type: STREAM_EVENT.DONE, totalSteps: 0, latencyMs: 999 })
    )

    const { result } = renderHook(() => useAgentStream())
    await act(async () => { await result.current.sendMessage("time") })

    expect(result.current.totalLatencyMs).toBe(999)
  })

  it("sets error from ERROR event", async () => {
    mockedStreamChat.mockResolvedValue(
      makeStreamResponse({ type: STREAM_EVENT.ERROR, message: "something broke" })
    )

    const { result } = renderHook(() => useAgentStream())
    await act(async () => { await result.current.sendMessage("oops") })

    expect(result.current.error).toBe("something broke")
  })

  it("clearMessages resets all state", async () => {
    mockedStreamChat.mockResolvedValue(
      makeStreamResponse(
        { type: STREAM_EVENT.TOKEN_DELTA, content: "hi" },
        { type: STREAM_EVENT.DONE, totalSteps: 0, latencyMs: 50 }
      )
    )

    const { result } = renderHook(() => useAgentStream())
    await act(async () => { await result.current.sendMessage("hello") })
    expect(result.current.messages.length).toBeGreaterThan(0)

    act(() => { result.current.clearMessages() })

    expect(result.current.messages).toEqual([])
    expect(result.current.traceSteps).toEqual([])
    expect(result.current.totalLatencyMs).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it("clearError clears only the error", async () => {
    mockedStreamChat.mockResolvedValue(
      makeStreamResponse({ type: STREAM_EVENT.ERROR, message: "err" })
    )

    const { result } = renderHook(() => useAgentStream())
    await act(async () => { await result.current.sendMessage("x") })
    expect(result.current.error).toBe("err")

    act(() => { result.current.clearError() })
    expect(result.current.error).toBeNull()
    expect(result.current.messages.length).toBeGreaterThan(0)
  })

  it("sets error when streamChat rejects", async () => {
    mockedStreamChat.mockRejectedValue(new Error("network error"))

    const { result } = renderHook(() => useAgentStream())
    await act(async () => { await result.current.sendMessage("fail") })

    await waitFor(() => expect(result.current.error).toBe("network error"))
  })

  it("isStreaming is true during and false after sendMessage", async () => {
    let resolveStream!: () => void
    const streamingDone = new Promise<void>((res) => { resolveStream = res })

    mockedStreamChat.mockResolvedValue(
      makeStreamResponse({ type: STREAM_EVENT.DONE, totalSteps: 0, latencyMs: 10 })
    )

    const { result } = renderHook(() => useAgentStream())

    // before
    expect(result.current.isStreaming).toBe(false)

    await act(async () => { await result.current.sendMessage("stream test") })

    // after
    expect(result.current.isStreaming).toBe(false)
    resolveStream()
    await streamingDone
  })
})
