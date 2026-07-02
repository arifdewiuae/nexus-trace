"use client"

import { useCallback, useEffect, useReducer, useRef } from "react"
import type { Message, ApiKeys } from "@/lib/types"
import type { Provider } from "@/lib/config"
import type { HistoryMessage } from "@/lib/api/chat"
import { parseSSE } from "@/lib/streaming/utils"
import { streamChat } from "@/lib/api/chat"
import { AGENT_ACTION, reducer, emptyState } from "@/lib/agent-stream/reducer"
import { loadPersisted, persistState } from "@/lib/agent-stream/storage"

export function useAgentStream(apiKeys?: ApiKeys | null, provider?: Provider) {
  const [state, dispatch] = useReducer(reducer, undefined, emptyState)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<readonly Message[]>(state.messages)
  const apiKeysRef = useRef(apiKeys)
  const providerRef = useRef(provider)

  useEffect(() => {
    messagesRef.current = state.messages
  }, [state.messages])
  useEffect(() => {
    apiKeysRef.current = apiKeys
  }, [apiKeys])
  useEffect(() => {
    providerRef.current = provider
  }, [provider])

  // Hydrate from sessionStorage after mount so the first render matches SSR.
  useEffect(() => {
    dispatch({ kind: AGENT_ACTION.HYDRATE, payload: loadPersisted() })
  }, [])

  // Mirror live state back to storage once hydrated (the initial empty render must not clobber it).
  useEffect(() => {
    if (!state.hydrated) return
    persistState(state)
  }, [state])

  const sendMessage = useCallback(async (content: string) => {
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    const assistantId = crypto.randomUUID()

    const history: HistoryMessage[] = messagesRef.current
      .filter((m) => !m.isStreaming && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }))

    dispatch({ kind: AGENT_ACTION.SEND_START, userId: crypto.randomUUID(), assistantId, content })

    try {
      const res = await streamChat(
        content,
        history,
        abort.signal,
        apiKeysRef.current ?? undefined,
        providerRef.current
      )

      for await (const event of parseSSE(res)) {
        if (abort.signal.aborted) break
        dispatch({ kind: AGENT_ACTION.STREAM_EVENT, event, assistantId })
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        dispatch({
          kind: AGENT_ACTION.SET_ERROR,
          message: err instanceof Error ? err.message : "Something went wrong",
        })
      }
    } finally {
      dispatch({ kind: AGENT_ACTION.STREAM_SETTLED, assistantId })
    }
  }, [])

  const clearMessages = useCallback(() => {
    abortRef.current?.abort()
    dispatch({ kind: AGENT_ACTION.CLEAR_ALL })
  }, [])

  const clearError = useCallback(() => dispatch({ kind: AGENT_ACTION.CLEAR_ERROR }), [])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    messages: state.messages,
    traceSteps: state.traceSteps,
    isStreaming: state.isStreaming,
    totalLatencyMs: state.totalLatencyMs,
    ttftMs: state.ttftMs,
    langsmithRunId: state.langsmithRunId,
    sessionUsage: state.sessionUsage,
    sessionCostUsd: state.sessionCostUsd,
    error: state.error,
    sendMessage,
    clearMessages,
    clearError,
    stopStreaming,
  }
}
