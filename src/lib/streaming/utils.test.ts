import { describe, it, expect } from "vitest"
import { parseSSE } from "./utils"
import { encodeEvent, STREAM_EVENT, type StreamEvent } from "./types"

// ── encodeEvent ──────────────────────────────────────────────────────────────

describe("encodeEvent", () => {
  it("produces a valid SSE frame", () => {
    const event: StreamEvent = { type: STREAM_EVENT.TOKEN_DELTA, content: "hello" }
    expect(encodeEvent(event)).toBe(`data: ${JSON.stringify(event)}\n\n`)
  })

  it("serialises every event type without throwing", () => {
    const events: StreamEvent[] = [
      { type: STREAM_EVENT.TOKEN_DELTA, content: "hi" },
      { type: STREAM_EVENT.MODEL_START, modelCallId: "m1", label: "Reasoning" },
      { type: STREAM_EVENT.MODEL_END, modelCallId: "m1", durationMs: 250 },
      { type: STREAM_EVENT.TOOL_START, toolName: "web_search", toolCallId: "t1", args: { query: "q" } },
      { type: STREAM_EVENT.TOOL_RESULT, toolName: "web_search", toolCallId: "t1", result: "res", durationMs: 100 },
      { type: STREAM_EVENT.STEP_END, stepIndex: 0 },
      { type: STREAM_EVENT.DONE, totalSteps: 2, latencyMs: 1200 },
      { type: STREAM_EVENT.ERROR, message: "oops" },
    ]
    for (const e of events) {
      expect(() => encodeEvent(e)).not.toThrow()
      expect(encodeEvent(e)).toMatch(/^data: .+\n\n$/)
    }
  })
})

// ── parseSSE ─────────────────────────────────────────────────────────────────

function makeResponse(frames: string): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      ctrl.enqueue(encoder.encode(frames))
      ctrl.close()
    },
  })
  return new Response(stream)
}

async function collect(res: Response): Promise<StreamEvent[]> {
  const events: StreamEvent[] = []
  for await (const e of parseSSE(res)) events.push(e)
  return events
}

describe("parseSSE", () => {
  it("parses a single event", async () => {
    const event: StreamEvent = { type: STREAM_EVENT.TOKEN_DELTA, content: "world" }
    const res = makeResponse(encodeEvent(event))
    await expect(collect(res)).resolves.toEqual([event])
  })

  it("parses multiple events in one chunk", async () => {
    const e1: StreamEvent = { type: STREAM_EVENT.TOKEN_DELTA, content: "a" }
    const e2: StreamEvent = { type: STREAM_EVENT.DONE, totalSteps: 1, latencyMs: 500 }
    const res = makeResponse(encodeEvent(e1) + encodeEvent(e2))
    await expect(collect(res)).resolves.toEqual([e1, e2])
  })

  it("skips lines that do not start with 'data: '", async () => {
    const good: StreamEvent = { type: STREAM_EVENT.TOKEN_DELTA, content: "ok" }
    const raw = `comment: ignored\n\n${encodeEvent(good)}`
    const res = makeResponse(raw)
    await expect(collect(res)).resolves.toEqual([good])
  })

  it("silently skips malformed JSON", async () => {
    const bad = "data: {broken json}\n\n"
    const good: StreamEvent = { type: STREAM_EVENT.TOKEN_DELTA, content: "fine" }
    const res = makeResponse(bad + encodeEvent(good))
    await expect(collect(res)).resolves.toEqual([good])
  })

  it("returns empty array for an empty stream", async () => {
    const res = makeResponse("")
    await expect(collect(res)).resolves.toEqual([])
  })
})
