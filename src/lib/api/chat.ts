import type { ApiKeys, MessageRole } from "@/lib/types"
import {
  HEADER_FIREWORKS_KEY,
  HEADER_ANTHROPIC_KEY,
  HEADER_TAVILY_KEY,
  HEADER_OPENAI_KEY,
  HEADER_LLM_PROVIDER,
  type Provider,
  CHAT_API_PATH,
} from "@/lib/config"

export type HistoryMessage = { role: MessageRole; content: string }

export async function streamChat(
  content: string,
  history: HistoryMessage[],
  signal: AbortSignal,
  apiKeys?: ApiKeys,
  provider?: Provider
): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (provider) headers[HEADER_LLM_PROVIDER] = provider
  if (apiKeys?.fireworksKey) headers[HEADER_FIREWORKS_KEY] = apiKeys.fireworksKey
  if (apiKeys?.anthropicKey) headers[HEADER_ANTHROPIC_KEY] = apiKeys.anthropicKey
  if (apiKeys?.tavilyKey) headers[HEADER_TAVILY_KEY] = apiKeys.tavilyKey
  if (apiKeys?.openaiKey) headers[HEADER_OPENAI_KEY] = apiKeys.openaiKey

  const res = await fetch(CHAT_API_PATH, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: content, history }),
    signal,
  })

  if (!res.ok) {
    // Only parse JSON when the server actually sent it — an HTML/text error page (proxy,
    // gateway timeout) would otherwise collapse into a generic "Request failed".
    const contentType = res.headers.get("content-type") ?? ""

    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null)
      throw new Error((data as { error?: string } | null)?.error ?? res.statusText ?? "Request failed")
    }
    const text = await res.text().catch(() => "")
    throw new Error(text.trim() || res.statusText || "Request failed")
  }

  return res
}
