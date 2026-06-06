import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { randomUUID } from "crypto"
import { z } from "zod"
import { runAgentStream } from "@/lib/agent/graph"
import { encodeEvent, STREAM_EVENT } from "@/lib/streaming/types"
import { generatorToStream } from "@/lib/streaming/utils"
import { checkRateLimit } from "@/lib/ratelimit"
import type { ApiKeys } from "@/lib/types"
import {
  HEADER_FIREWORKS_KEY,
  HEADER_TAVILY_KEY,
  HEADER_OPENAI_KEY,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE_S,
  MAX_MESSAGE_LENGTH,
} from "@/lib/config"
import { checkModeration, type ModerationResult } from "@/lib/moderation"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
}

const ChatRequestSchema = z.object({
  message: z
    .string()
    // Strip null bytes and surrounding whitespace before length/emptiness checks.
    .transform((s) => s.replace(/\0/g, "").trim())
    .pipe(
      z
        .string()
        .min(1, "'message' is required and must be a non-empty string")
        .max(MAX_MESSAGE_LENGTH, `Message exceeds ${MAX_MESSAGE_LENGTH} character limit`)
    ),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .default([]),
})

type ChatHistory = z.infer<typeof ChatRequestSchema>["history"]

interface ResolvedKeys {
  keys: ApiKeys
  isDemo: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonError(message: string, status: number, headers?: Record<string, string>): Response {
  return Response.json({ error: message }, { status, headers })
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

type ParsedRequest =
  | { ok: true; message: string; history: ChatHistory }
  | { ok: false; response: Response }

async function parseChatRequest(req: NextRequest): Promise<ParsedRequest> {
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return { ok: false, response: jsonError("Invalid JSON body", 400) }
  }

  const parsed = ChatRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(parsed.error.issues[0]?.message ?? "Invalid request body", 400),
    }
  }
  return { ok: true, message: parsed.data.message, history: parsed.data.history }
}

// SSE headers plus a session cookie on first contact. `Secure` only in production —
// omitting it locally keeps the cookie working over plain-HTTP dev.
function buildResponseHeaders(sessionId: string, isNew: boolean): Record<string, string> {
  const headers: Record<string, string> = { ...(SSE_HEADERS as Record<string, string>) }
  if (isNew) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
    headers["Set-Cookie"] =
      `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=${SESSION_COOKIE_MAX_AGE_S}`
  }
  return headers
}

async function runModeration(
  message: string,
  req: NextRequest
): Promise<ModerationResult & { durationMs: number }> {
  const userOpenaiKey = req.headers.get(HEADER_OPENAI_KEY) ?? undefined
  const start = Date.now()
  const result = await checkModeration(message, userOpenaiKey)
  return { ...result, durationMs: Date.now() - start }
}

// One MODERATION(blocked) frame — the client fills the assistant bubble with the reason.
function moderationBlockedStream(durationMs: number, reason: string): ReadableStream<Uint8Array> {
  async function* gen(): AsyncGenerator<string> {
    yield encodeEvent({ type: STREAM_EVENT.MODERATION, durationMs, blocked: true, reason })
  }
  return generatorToStream(gen(), () => "")
}

// MODERATION(ok) frame, then the agent's token/tool/done stream.
function buildAgentStream(
  message: string,
  history: ChatHistory,
  keys: ApiKeys,
  moderationDurationMs: number
): ReadableStream<Uint8Array> {
  async function* withModeration(): AsyncGenerator<string> {
    yield encodeEvent({ type: STREAM_EVENT.MODERATION, durationMs: moderationDurationMs, blocked: false })
    yield* runAgentStream(message, history, keys)
  }
  return generatorToStream(withModeration(), (err) => {
    const msg = err instanceof Error ? err.message : "Internal server error"
    return encodeEvent({ type: STREAM_EVENT.ERROR, message: msg })
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────
// Linear policy pipeline: session → validate → keys → rate limit → moderation → stream.

export async function POST(req: NextRequest) {
  const { sessionId, isNew } = await getOrCreateSession()

  const parsed = await parseChatRequest(req)
  if (!parsed.ok) return parsed.response

  const resolved = resolveKeys(req)
  if (!resolved) {
    return jsonError("API keys required. Add your Fireworks and Tavily keys in Settings ⚙️", 401)
  }

  // Rate limit BEFORE moderation so the moderation API can't be spammed for free.
  const { allowed, retryAfterMs } = await checkRateLimit(sessionId, resolved.isDemo)
  if (!allowed) {
    return jsonError("Rate limit exceeded. Please wait before sending another message.", 429, {
      "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
    })
  }

  const responseHeaders = buildResponseHeaders(sessionId, isNew)

  const moderation = await runModeration(parsed.message, req)
  if (moderation.blocked) {
    return new Response(moderationBlockedStream(moderation.durationMs, moderation.reason), {
      headers: responseHeaders,
    })
  }

  const stream = buildAgentStream(parsed.message, parsed.history, resolved.keys, moderation.durationMs)
  return new Response(stream, { headers: responseHeaders })
}
