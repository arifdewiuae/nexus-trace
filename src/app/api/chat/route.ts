import type { NextRequest } from "next/server"
import { runAgentStream } from "@/lib/agent/graph"
import { encodeEvent, STREAM_EVENT } from "@/lib/streaming/types"
import { generatorToStream } from "@/lib/streaming/utils"
import type { ApiKeys } from "@/lib/types"
import { HEADER_FIREWORKS_KEY, HEADER_TAVILY_KEY } from "@/lib/config"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
}

function resolveKeys(req: NextRequest): ApiKeys | null {
  const fireworksKey =
    req.headers.get(HEADER_FIREWORKS_KEY) ||
    (process.env.DEMO_KEYS_ENABLED === "true" ? (process.env.FIREWORKS_API_KEY ?? "") : "")

  const tavilyKey =
    req.headers.get(HEADER_TAVILY_KEY) ||
    (process.env.DEMO_KEYS_ENABLED === "true" ? (process.env.TAVILY_API_KEY ?? "") : "")

  if (!fireworksKey.trim() || !tavilyKey.trim()) return null

  return { fireworksKey, tavilyKey }
}

export async function POST(req: NextRequest) {
  let message: string
  let history: { role: string; content: string }[] = []

  try {
    const body = await req.json()
    message = body?.message
    history = Array.isArray(body?.history) ? body.history : []
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return Response.json(
      { error: "'message' is required and must be a non-empty string" },
      { status: 400 }
    )
  }

  const keys = resolveKeys(req)
  if (!keys) {
    return Response.json(
      { error: "API keys required. Add your Fireworks and Tavily keys in Settings ⚙️" },
      { status: 401 }
    )
  }

  const stream = generatorToStream(runAgentStream(message.trim(), history, keys), (err) => {
    const msg = err instanceof Error ? err.message : "Internal server error"
    return encodeEvent({ type: STREAM_EVENT.ERROR, message: msg })
  })

  return new Response(stream, { headers: SSE_HEADERS })
}
