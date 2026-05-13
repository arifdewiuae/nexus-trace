import { describe, it, expect } from "vitest"
import { trimHistory } from "./graph"
import { HISTORY_MAX_TURNS, HISTORY_MAX_CHARS_PER_MESSAGE } from "@/lib/config"

type Msg = { role: string; content: string }
const msg = (role: string, content: string): Msg => ({ role, content })

describe("trimHistory", () => {
  it("returns the full history when under the turn limit", () => {
    const history = [msg("user", "hi"), msg("assistant", "hello")]
    expect(trimHistory(history)).toEqual(history)
  })

  it("keeps only the last HISTORY_MAX_TURNS * 2 messages", () => {
    const maxMessages = HISTORY_MAX_TURNS * 2
    const history = Array.from({ length: maxMessages + 4 }, (_, i) =>
      msg(i % 2 === 0 ? "user" : "assistant", `msg ${i}`)
    )
    const result = trimHistory(history)
    expect(result).toHaveLength(maxMessages)
    expect(result[0].content).toBe(`msg ${4}`)
  })

  it("truncates messages that exceed HISTORY_MAX_CHARS_PER_MESSAGE", () => {
    const long = "x".repeat(HISTORY_MAX_CHARS_PER_MESSAGE + 100)
    const result = trimHistory([msg("user", long)])
    expect(result[0].content).toHaveLength(HISTORY_MAX_CHARS_PER_MESSAGE + 1) // +1 for ellipsis char
    expect(result[0].content.endsWith("…")).toBe(true)
  })

  it("does not truncate messages at exactly the char limit", () => {
    const exact = "y".repeat(HISTORY_MAX_CHARS_PER_MESSAGE)
    const result = trimHistory([msg("user", exact)])
    expect(result[0].content).toBe(exact)
  })

  it("preserves role on truncated messages", () => {
    const long = "z".repeat(HISTORY_MAX_CHARS_PER_MESSAGE + 1)
    const result = trimHistory([msg("assistant", long)])
    expect(result[0].role).toBe("assistant")
  })

  it("returns empty array for empty input", () => {
    expect(trimHistory([])).toEqual([])
  })
})
