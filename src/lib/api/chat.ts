import type { ApiKeys } from "@/lib/types"
import { HEADER_FIREWORKS_KEY, HEADER_TAVILY_KEY } from "@/lib/config"

export type HistoryMessage = { role: "user" | "assistant"; content: string }

export async function streamChat(
  content: string,
  history: HistoryMessage[],
  signal: AbortSignal,
  apiKeys?: ApiKeys
): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (apiKeys?.fireworksKey) headers[HEADER_FIREWORKS_KEY] = apiKeys.fireworksKey
  if (apiKeys?.tavilyKey) headers[HEADER_TAVILY_KEY] = apiKeys.tavilyKey

  const res = await fetch("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({ message: content, history }),
    signal,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((data as { error?: string }).error ?? "Request failed")
  }

  return res
}
