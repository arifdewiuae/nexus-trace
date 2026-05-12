import { describe, it, expect } from "vitest"
import { formatDuration } from "./utils"

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
