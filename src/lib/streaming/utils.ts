import type { StreamEvent } from "./types"

const encoder = new TextEncoder()

export function generatorToStream(
  gen: AsyncGenerator<string>,
  onError?: (err: unknown) => string
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of gen) {
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (err) {
        console.error("[generatorToStream] generator threw:", err)
        if (onError) {
          try {
            controller.enqueue(encoder.encode(onError(err)))
          } catch (handlerErr) {
            console.error("[generatorToStream] onError handler threw:", handlerErr)
          }
        }
      } finally {
        controller.close()
      }
    },
  })
}

function parseFrame(part: string): StreamEvent | null {
  if (!part.startsWith("data: ")) return null
  try {
    return JSON.parse(part.slice(6)) as StreamEvent
  } catch {
    console.warn("[parseSSE] dropped malformed SSE frame:", part.slice(0, 200))
    return null
  }
}

export async function* parseSSE(response: Response): AsyncGenerator<StreamEvent> {
  if (!response.body) throw new Error("Response has no body; cannot parse SSE stream")

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split("\n\n")
      buffer = parts.pop() ?? ""

      for (const part of parts) {
        const event = parseFrame(part)
        if (event) yield event
      }
    }

    // Flush any bytes the decoder held back (incomplete multibyte char) and emit a final
    // frame that wasn't terminated by "\n\n" — otherwise the last event is silently lost.
    buffer += decoder.decode()

    for (const part of buffer.split("\n\n")) {
      const event = parseFrame(part)
      if (event) yield event
    }
  } finally {
    reader.releaseLock()
  }
}
