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
