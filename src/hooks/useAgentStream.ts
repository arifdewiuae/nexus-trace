"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Message, TraceStep } from "@/lib/types"
import type { HistoryMessage } from "@/lib/api/chat"
import { TRACE_STATUS, STEP_TYPE } from "@/lib/types"
import { STREAM_EVENT, type StreamEvent } from "@/lib/streaming/types"
import { parseSSE } from "@/lib/streaming/utils"
import { streamChat } from "@/lib/api/chat"
import { STORAGE_KEY_MESSAGES, STORAGE_KEY_TRACE_STEPS } from "@/lib/config"

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function useAgentStream() {
  const [messages, setMessages] = useState<Message[]>([])
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [totalLatencyMs, setTotalLatencyMs] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<Message[]>(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Restore from sessionStorage after mount to avoid SSR/client mismatch
  useEffect(() => {
    const storedMessages = readStorage<Message[]>(STORAGE_KEY_MESSAGES, [])
    const storedSteps = readStorage<TraceStep[]>(STORAGE_KEY_TRACE_STEPS, [])
    if (storedMessages.length > 0) {
      setMessages(storedMessages.map((m) => ({ ...m, isStreaming: false })))
    }
    if (storedSteps.length > 0) {
      setTraceSteps(storedSteps)
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_TRACE_STEPS, JSON.stringify(traceSteps))
  }, [traceSteps])

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
      setTraceSteps([])
      setIsStreaming(true)
      setTotalLatencyMs(null)
      setError(null)

      try {
        const res = await streamChat(content, history, abort.signal)

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
    setMessages([])
    setTraceSteps([])
    setError(null)
    setIsStreaming(false)
    setTotalLatencyMs(null)
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
    error,
    sendMessage,
    clearMessages,
    clearError,
    stopStreaming,
  }
}
