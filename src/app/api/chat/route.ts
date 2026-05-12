import type { NextRequest } from "next/server"
import { runAgentStream } from "@/lib/agent/graph"
import { encodeEvent, STREAM_EVENT } from "@/lib/streaming/types"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const encoder = new TextEncoder()

function generatorToStream(gen: AsyncGenerator<string>): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of gen) {
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error"
        controller.enqueue(
          encoder.encode(encodeEvent({ type: STREAM_EVENT.ERROR, message }))
        )
      } finally {
        controller.close()
      }
    },
  })
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
    return Response.json({ error: "'message' is required and must be a non-empty string" }, { status: 400 })
  }

  const stream = generatorToStream(runAgentStream(message.trim()))

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
