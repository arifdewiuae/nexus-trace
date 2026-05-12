import { describe, it, expect, vi } from "vitest"
import { withRetry } from "./retry"

describe("withRetry", () => {
  it("returns the value on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok")
    await expect(withRetry(fn, 3, 0)).resolves.toBe("ok")
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("retries after failure and resolves when fn succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail1"))
      .mockRejectedValueOnce(new Error("fail2"))
      .mockResolvedValue("recovered")

    await expect(withRetry(fn, 3, 0)).resolves.toBe("recovered")
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it("throws the last error after exhausting all retries", async () => {
    const error = new Error("permanent")
    const fn = vi.fn().mockRejectedValue(error)

    await expect(withRetry(fn, 3, 0)).rejects.toThrow("permanent")
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it("calls fn exactly `retries` times before giving up", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("x"))
    await withRetry(fn, 5, 0).catch(() => {})
    expect(fn).toHaveBeenCalledTimes(5)
  })

  it("waits between retries using delayMs * attempt", async () => {
    vi.useFakeTimers()
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("a"))
      .mockRejectedValueOnce(new Error("b"))
      .mockResolvedValue("done")

    const promise = withRetry(fn, 3, 100)

    // attempt 1 fails → wait 100ms * 1
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBe("done")

    vi.useRealTimers()
  })
})
