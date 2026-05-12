export type HistoryMessage = { role: "user" | "assistant"; content: string }

export async function streamChat(
  content: string,
  history: HistoryMessage[],
  signal: AbortSignal
): Promise<Response> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: content, history }),
    signal,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((data as { error?: string }).error ?? "Request failed")
  }

  return res
}
