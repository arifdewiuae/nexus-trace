import { describe, it, expect } from "vitest"
import { formatDuration, formatCost, formatTokenCount, normaliseBr, resolveToolDecision } from "./utils"

describe("formatDuration", () => {
  it("shows ms for values under 1 second", () => {
    expect(formatDuration(0)).toBe("0ms")
    expect(formatDuration(500)).toBe("500ms")
    expect(formatDuration(999)).toBe("999ms")
  })

  it("converts to seconds at exactly 1000ms", () => {
    expect(formatDuration(1000)).toBe("1.0s")
  })

  it("shows one decimal place for seconds", () => {
    expect(formatDuration(1500)).toBe("1.5s")
    expect(formatDuration(2340)).toBe("2.3s")
    expect(formatDuration(10000)).toBe("10.0s")
  })

  it("rounds seconds correctly", () => {
    expect(formatDuration(1050)).toBe("1.1s")
    expect(formatDuration(1049)).toBe("1.0s")
  })
})

describe("formatCost", () => {
  it("returns <$0.0001 for near-zero values", () => {
    expect(formatCost(0)).toBe("<$0.0001")
    expect(formatCost(0.00004)).toBe("<$0.0001")
    expect(formatCost(0.000049)).toBe("<$0.0001")
  })

  it("formats 4 decimal places between $0.00005 and $0.001", () => {
    expect(formatCost(0.00005)).toBe("$0.0001")
    expect(formatCost(0.0005)).toBe("$0.0005")
    expect(formatCost(0.0009)).toBe("$0.0009")
  })

  it("formats 3 decimal places between $0.001 and $0.1", () => {
    expect(formatCost(0.001)).toBe("$0.001")
    expect(formatCost(0.025)).toBe("$0.025")
    expect(formatCost(0.099)).toBe("$0.099")
  })

  it("formats 2 decimal places at $0.1 and above", () => {
    expect(formatCost(0.1)).toBe("$0.10")
    expect(formatCost(1.5)).toBe("$1.50")
    expect(formatCost(10)).toBe("$10.00")
  })
})

describe("formatTokenCount", () => {
  it("returns plain number below 1000", () => {
    expect(formatTokenCount(0)).toBe("0")
    expect(formatTokenCount(42)).toBe("42")
    expect(formatTokenCount(999)).toBe("999")
  })

  it("formats with k suffix at 1000 exactly", () => {
    expect(formatTokenCount(1000)).toBe("1.0k")
  })

  it("formats with one decimal place in k range", () => {
    expect(formatTokenCount(1500)).toBe("1.5k")
    expect(formatTokenCount(12300)).toBe("12.3k")
    expect(formatTokenCount(100000)).toBe("100.0k")
  })
})

describe("normaliseBr", () => {
  it("replaces <br> with newline", () => {
    expect(normaliseBr("a<br>b")).toBe("a\nb")
  })

  it("handles self-closing variants", () => {
    expect(normaliseBr("a<br/>b")).toBe("a\nb")
    expect(normaliseBr("a<br />b")).toBe("a\nb")
  })

  it("is case-insensitive", () => {
    expect(normaliseBr("a<BR>b")).toBe("a\nb")
    expect(normaliseBr("a<Br />b")).toBe("a\nb")
  })

  it("replaces multiple occurrences", () => {
    expect(normaliseBr("a<br>b<br>c")).toBe("a\nb\nc")
  })

  it("returns unchanged string when no br tags", () => {
    expect(normaliseBr("hello world")).toBe("hello world")
  })
})

describe("resolveToolDecision", () => {
  it("includes query string when present", () => {
    expect(resolveToolDecision("web_search", { query: "latest AI news" }))
      .toBe('→ web_search: "latest AI news"')
  })

  it("falls back to tool name only when no query", () => {
    expect(resolveToolDecision("get_current_datetime", {})).toBe("→ get_current_datetime")
  })

  it("falls back when query is empty string", () => {
    expect(resolveToolDecision("web_search", { query: "   " })).toBe("→ web_search")
  })

  it("falls back when args is null", () => {
    expect(resolveToolDecision("web_search", null)).toBe("→ web_search")
  })

  it("falls back when args is a primitive", () => {
    expect(resolveToolDecision("web_search", 42)).toBe("→ web_search")
  })
})
