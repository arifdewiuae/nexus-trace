import { describe, it, expect, vi, afterEach } from "vitest"
import { checkRateLimit } from "./ratelimit"
import { RATE_LIMIT_DEMO_MAX, RATE_LIMIT_WINDOW_S } from "./config"

// These tests exercise the in-memory fallback (no Upstash env vars under vitest).
// Each test uses a unique session id since the limiter buckets are module singletons.

describe("checkRateLimit (in-memory fallback)", () => {
  afterEach(() => vi.useRealTimers())

  it("allows requests up to the demo cap, then blocks with a retry delay", async () => {
    const id = "cap-demo"
    for (let i = 0; i < RATE_LIMIT_DEMO_MAX; i++) {
      expect((await checkRateLimit(id, true)).allowed).toBe(true)
    }
    const blocked = await checkRateLimit(id, true)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
  })

  it("gives own-key sessions a higher cap than demo", async () => {
    const id = "cap-own"
    // One past the demo cap still succeeds because own-key limit is higher.
    for (let i = 0; i <= RATE_LIMIT_DEMO_MAX; i++) {
      expect((await checkRateLimit(id, false)).allowed).toBe(true)
    }
  })

  it("tracks each session independently", async () => {
    const a = "indep-a"
    for (let i = 0; i < RATE_LIMIT_DEMO_MAX; i++) await checkRateLimit(a, true)
    expect((await checkRateLimit(a, true)).allowed).toBe(false)
    expect((await checkRateLimit("indep-b", true)).allowed).toBe(true)
  })

  it("resets once the window elapses", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
    const id = "reset-demo"
    for (let i = 0; i < RATE_LIMIT_DEMO_MAX; i++) await checkRateLimit(id, true)
    expect((await checkRateLimit(id, true)).allowed).toBe(false)

    vi.setSystemTime(Date.now() + RATE_LIMIT_WINDOW_S * 1000 + 1000)
    expect((await checkRateLimit(id, true)).allowed).toBe(true)
  })
})
