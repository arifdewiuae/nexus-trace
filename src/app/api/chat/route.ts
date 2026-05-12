import type { NextRequest } from "next/server"
import { runAgentStream } from "@/lib/agent/graph"
import { encodeEvent, STREAM_EVENT } from "@/lib/streaming/types"
import { generatorToStream } from "@/lib/streaming/utils"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
}

export async function POST(req: NextRequest) {
  let message: string

  try {
    const body = await req.json()
    message = body?.message
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return Response.json(
      { error: "'message' is required and must be a non-empty string" },
      { status: 400 }
    )
  }

  const stream = generatorToStream(runAgentStream(message.trim()), (err) => {
    const msg = err instanceof Error ? err.message : "Internal server error"
    return encodeEvent({ type: STREAM_EVENT.ERROR, message: msg })
  })

  return new Response(stream, { headers: SSE_HEADERS })
}
