"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Message, TraceStep, ApiKeys, TokenUsage } from "@/lib/types"
import type { HistoryMessage } from "@/lib/api/chat"
import { TRACE_STATUS, STEP_TYPE } from "@/lib/types"
import { STREAM_EVENT, type StreamEvent } from "@/lib/streaming/types"
import { parseSSE } from "@/lib/streaming/utils"
import { streamChat } from "@/lib/api/chat"
import {
  STORAGE_KEY_MESSAGES,
  STORAGE_KEY_TRACE_STEPS,
  STORAGE_KEY_SESSION_USAGE,
  STORAGE_KEY_QUERY_USAGE,
} from "@/lib/config"

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function useAgentStream(apiKeys?: ApiKeys | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [totalLatencyMs, setTotalLatencyMs] = useState<number | null>(null)
  const [ttftMs, setTtftMs] = useState<number | null>(null)
  const [queryUsage, setQueryUsage] = useState<TokenUsage | null>(null)
  const [queryCostUsd, setQueryCostUsd] = useState<number | null>(null)
  const [sessionUsage, setSessionUsage] = useState<TokenUsage>({ inputTokens: 0, outputTokens: 0, totalTokens: 0 })
  const [sessionCostUsd, setSessionCostUsd] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<Message[]>(messages)
  const apiKeysRef = useRef(apiKeys)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])
  useEffect(() => {
    apiKeysRef.current = apiKeys
  }, [apiKeys])

  // Restore from sessionStorage after mount to avoid SSR/client mismatch
  useEffect(() => {
    const storedMessages = readStorage<Message[]>(STORAGE_KEY_MESSAGES, [])
    const storedSteps = readStorage<TraceStep[]>(STORAGE_KEY_TRACE_STEPS, [])
    const storedQuery = readStorage<{ usage: TokenUsage; costUsd: number | null } | null>(
      STORAGE_KEY_QUERY_USAGE,
      null
    )
    const storedSession = readStorage<{ usage: TokenUsage; costUsd: number } | null>(
      STORAGE_KEY_SESSION_USAGE,
      null
    )
    if (storedMessages.length > 0) {
      setMessages(storedMessages.map((m) => ({ ...m, isStreaming: false })))
    }
    if (storedSteps.length > 0) {
      setTraceSteps(storedSteps)
    }
    if (storedQuery) {
      setQueryUsage(storedQuery.usage)
      setQueryCostUsd(storedQuery.costUsd)
    }
    if (storedSession) {
      setSessionUsage(storedSession.usage)
      setSessionCostUsd(storedSession.costUsd)
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_TRACE_STEPS, JSON.stringify(traceSteps))
  }, [traceSteps])

  useEffect(() => {
    if (queryUsage !== null) {
      sessionStorage.setItem(
        STORAGE_KEY_QUERY_USAGE,
        JSON.stringify({ usage: queryUsage, costUsd: queryCostUsd })
      )
    } else {
      sessionStorage.removeItem(STORAGE_KEY_QUERY_USAGE)
    }
  }, [queryUsage, queryCostUsd])

  useEffect(() => {
    if (sessionUsage.totalTokens > 0) {
      sessionStorage.setItem(
        STORAGE_KEY_SESSION_USAGE,
        JSON.stringify({ usage: sessionUsage, costUsd: sessionCostUsd })
      )
    }
  }, [sessionUsage, sessionCostUsd])

  const applyEvent = useCallback((event: StreamEvent, assistantId: string) => {
    switch (event.type) {
      case STREAM_EVENT.TOKEN_DELTA:
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + event.content } : m))
        )
        break

      case STREAM_EVENT.MODEL_START:
        setTraceSteps((prev) => {
          const existing = prev.find((s) => s.id === event.modelCallId)
          if (existing) {
            // Relabel from "Reasoning" → "Responding" once tokens start
            return prev.map((s) =>
              s.id === event.modelCallId ? { ...s, toolName: event.label } : s
            )
          }
          return [
            ...prev,
            {
              id: event.modelCallId,
              stepType: STEP_TYPE.MODEL,
              toolName: event.label,
              status: TRACE_STATUS.RUNNING,
              startedAt: Date.now(),
            },
          ]
        })
        break

      case STREAM_EVENT.MODEL_END:
        setTraceSteps((prev) =>
          prev.map((s) =>
            s.id === event.modelCallId
              ? { ...s, status: TRACE_STATUS.DONE, durationMs: event.durationMs, endedAt: Date.now() }
              : s
          )
        )
        break

      case STREAM_EVENT.TOOL_START:
        setTraceSteps((prev) => [
          ...prev,
          {
            id: event.toolCallId,
            stepType: STEP_TYPE.TOOL,
            toolName: event.toolName,
            args: event.args,
            status: TRACE_STATUS.RUNNING,
            startedAt: Date.now(),
          },
        ])
        break

      case STREAM_EVENT.TOOL_RESULT:
        setTraceSteps((prev) =>
          prev.map((s) =>
            s.id === event.toolCallId
              ? {
                  ...s,
                  result: event.result,
                  durationMs: event.durationMs,
                  status: TRACE_STATUS.DONE,
                  endedAt: Date.now(),
                }
              : s
          )
        )
        break

      case STREAM_EVENT.DONE:
        setTotalLatencyMs(event.latencyMs)
        setTtftMs(event.ttftMs ?? null)
        if (event.inputTokens != null && event.outputTokens != null) {
          const usage: TokenUsage = {
            inputTokens: event.inputTokens,
            outputTokens: event.outputTokens,
            totalTokens: event.inputTokens + event.outputTokens,
          }
          const cost = event.estimatedCostUsd ?? null
          setQueryUsage(usage)
          setQueryCostUsd(cost)
          setSessionUsage((prev) => ({
            inputTokens: prev.inputTokens + usage.inputTokens,
            outputTokens: prev.outputTokens + usage.outputTokens,
            totalTokens: prev.totalTokens + usage.totalTokens,
          }))
          setSessionCostUsd((prev) => prev + (cost ?? 0))
        }
        break

      case STREAM_EVENT.ERROR:
        setError(event.message)
        break
    }
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort

      const assistantId = crypto.randomUUID()

      const history: HistoryMessage[] = messagesRef.current
        .filter((m) => !m.isStreaming && m.content.trim())
        .map((m) => ({ role: m.role, content: m.content }))

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content },
        { id: assistantId, role: "assistant", content: "", isStreaming: true },
      ])
      setTraceSteps((prev) =>
        prev.length > 0
          ? [
              ...prev,
              {
                id: crypto.randomUUID(),
                stepType: STEP_TYPE.DIVIDER,
                toolName: "",
                status: TRACE_STATUS.DONE,
                startedAt: Date.now(),
              },
            ]
          : prev
      )
      setIsStreaming(true)
      setTotalLatencyMs(null)
      setTtftMs(null)
      setQueryUsage(null)
      setQueryCostUsd(null)
      setError(null)

      try {
        const res = await streamChat(content, history, abort.signal, apiKeysRef.current ?? undefined)

        for await (const event of parseSSE(res)) {
          if (abort.signal.aborted) break
          applyEvent(event, assistantId)
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Something went wrong")
        }
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
        )
        setIsStreaming(false)
      }
    },
    [applyEvent]
  )

  const clearMessages = useCallback(() => {
    abortRef.current?.abort()
    sessionStorage.removeItem(STORAGE_KEY_MESSAGES)
    sessionStorage.removeItem(STORAGE_KEY_TRACE_STEPS)
    sessionStorage.removeItem(STORAGE_KEY_QUERY_USAGE)
    sessionStorage.removeItem(STORAGE_KEY_SESSION_USAGE)
    setMessages([])
    setTraceSteps([])
    setError(null)
    setIsStreaming(false)
    setTotalLatencyMs(null)
    setTtftMs(null)
    setQueryUsage(null)
    setQueryCostUsd(null)
    setSessionUsage({ inputTokens: 0, outputTokens: 0, totalTokens: 0 })
    setSessionCostUsd(0)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    messages,
    traceSteps,
    isStreaming,
    totalLatencyMs,
    ttftMs,
    queryUsage,
    queryCostUsd,
    sessionUsage,
    sessionCostUsd,
    error,
    sendMessage,
    clearMessages,
    clearError,
    stopStreaming,
  }
}
