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
        if (onError) {
          controller.enqueue(encoder.encode(onError(err)))
        }
      } finally {
        controller.close()
      }
    },
  })
}

export async function* parseSSE(response: Response): AsyncGenerator<StreamEvent> {
  const reader = response.body!.getReader()
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
        if (!part.startsWith("data: ")) continue
        try {
          yield JSON.parse(part.slice(6)) as StreamEvent
        } catch {
          // skip malformed events
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
