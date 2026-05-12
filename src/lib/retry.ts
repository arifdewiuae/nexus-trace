export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  delayMs: number
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, delayMs * attempt))
    }
  }
  throw new Error("Unreachable")
}
