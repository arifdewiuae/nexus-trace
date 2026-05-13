import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { randomUUID } from "crypto"
import { runAgentStream } from "@/lib/agent/graph"
import { encodeEvent, STREAM_EVENT } from "@/lib/streaming/types"
import { generatorToStream } from "@/lib/streaming/utils"
import { checkRateLimit } from "@/lib/ratelimit"
import type { ApiKeys } from "@/lib/types"
import {
  HEADER_FIREWORKS_KEY,
  HEADER_TAVILY_KEY,
  SESSION_COOKIE_NAME,
  MAX_MESSAGE_LENGTH,
} from "@/lib/config"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
}

interface ResolvedKeys {
  keys: ApiKeys
  isDemo: boolean
}

function resolveKeys(req: NextRequest): ResolvedKeys | null {
  const userFireworks = req.headers.get(HEADER_FIREWORKS_KEY)
  const userTavily = req.headers.get(HEADER_TAVILY_KEY)

  if (userFireworks?.trim() && userTavily?.trim()) {
    return { keys: { fireworksKey: userFireworks, tavilyKey: userTavily }, isDemo: false }
  }

  if (process.env.DEMO_KEYS_ENABLED === "true") {
    const fireworksKey = process.env.FIREWORKS_API_KEY ?? ""
    const tavilyKey = process.env.TAVILY_API_KEY ?? ""
    if (fireworksKey.trim() && tavilyKey.trim()) {
      return { keys: { fireworksKey, tavilyKey }, isDemo: true }
    }
  }

  return null
}

async function getOrCreateSession(): Promise<{ sessionId: string; isNew: boolean }> {
  const store = await cookies()
  const existing = store.get(SESSION_COOKIE_NAME)?.value
  if (existing) return { sessionId: existing, isNew: false }
  return { sessionId: randomUUID(), isNew: true }
}

export async function POST(req: NextRequest) {
  // ── Session ─────────────────────────────────────────────────────────────────
  const { sessionId, isNew } = await getOrCreateSession()

  // ── Parse body ───────────────────────────────────────────────────────────────
  let message: string
  let history: { role: string; content: string }[] = []

  try {
    const body = await req.json()
    message = body?.message
    history = Array.isArray(body?.history) ? body.history : []
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // ── Input validation ─────────────────────────────────────────────────────────
  if (!message || typeof message !== "string" || !message.trim()) {
    return Response.json(
      { error: "'message' is required and must be a non-empty string" },
      { status: 400 }
    )
  }

  // Strip null bytes, enforce length cap
  const sanitized = message.replace(/\0/g, "").trim()
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    return Response.json(
      { error: `Message exceeds ${MAX_MESSAGE_LENGTH} character limit` },
      { status: 400 }
    )
  }

  // ── Key resolution ───────────────────────────────────────────────────────────
  const resolved = resolveKeys(req)
  if (!resolved) {
    return Response.json(
      { error: "API keys required. Add your Fireworks and Tavily keys in Settings ⚙️" },
      { status: 401 }
    )
  }

  // ── Rate limiting ────────────────────────────────────────────────────────────
  const { allowed, retryAfterMs } = await checkRateLimit(sessionId, resolved.isDemo)
  if (!allowed) {
    const retryAfterS = Math.ceil(retryAfterMs / 1000)
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please wait before sending another message." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterS),
        },
      }
    )
  }

  // ── Stream response ──────────────────────────────────────────────────────────
  const stream = generatorToStream(runAgentStream(sanitized, history, resolved.keys), (err) => {
    const msg = err instanceof Error ? err.message : "Internal server error"
    return encodeEvent({ type: STREAM_EVENT.ERROR, message: msg })
  })

  const responseHeaders: Record<string, string> = { ...SSE_HEADERS as Record<string, string> }

  // Set session cookie on new sessions
  if (isNew) {
    responseHeaders["Set-Cookie"] =
      `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 365}`
  }

  return new Response(stream, { headers: responseHeaders })
}
