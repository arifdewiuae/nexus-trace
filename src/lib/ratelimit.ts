import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import {
  RATE_LIMIT_DEMO_MAX,
  RATE_LIMIT_OWN_KEY_MAX,
  RATE_LIMIT_WINDOW_S,
} from "./config"

export interface RateLimitResult {
  allowed: boolean
  retryAfterMs: number
}

// ── Upstash path (prod) ───────────────────────────────────────────────────────

function makeUpstashLimiters() {
  const redis = Redis.fromEnv()
  const window = `${RATE_LIMIT_WINDOW_S} s` as const

  const demo = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_DEMO_MAX, window),
    prefix: "rl:demo",
  })

  const ownKeys = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_OWN_KEY_MAX, window),
    prefix: "rl:own",
  })

  return { demo, ownKeys }
}

// ── In-memory fallback (dev / no Upstash env vars) ───────────────────────────

interface InMemoryBucket {
  count: number
  resetAt: number
}

function makeInMemoryLimiter(max: number) {
  const buckets = new Map<string, InMemoryBucket>()

  return async (id: string): Promise<RateLimitResult> => {
    const now = Date.now()
    const windowMs = RATE_LIMIT_WINDOW_S * 1000
    let bucket = buckets.get(id)

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs }
      buckets.set(id, bucket)
    }

    if (bucket.count >= max) {
      return { allowed: false, retryAfterMs: bucket.resetAt - now }
    }

    bucket.count++
    return { allowed: true, retryAfterMs: 0 }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

const hasUpstash =
  typeof process.env.UPSTASH_REDIS_REST_URL === "string" &&
  typeof process.env.UPSTASH_REDIS_REST_TOKEN === "string"

const upstash = hasUpstash ? makeUpstashLimiters() : null
const inMemDemo = makeInMemoryLimiter(RATE_LIMIT_DEMO_MAX)
const inMemOwn = makeInMemoryLimiter(RATE_LIMIT_OWN_KEY_MAX)

export async function checkRateLimit(
  sessionId: string,
  isDemo: boolean
): Promise<RateLimitResult> {
  if (upstash) {
    const limiter = isDemo ? upstash.demo : upstash.ownKeys
    const result = await limiter.limit(sessionId)
    return {
      allowed: result.success,
      retryAfterMs: result.success ? 0 : Math.max(0, result.reset - Date.now()),
    }
  }

  return isDemo ? inMemDemo(sessionId) : inMemOwn(sessionId)
}
