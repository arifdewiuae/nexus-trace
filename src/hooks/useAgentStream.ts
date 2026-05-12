"use client"

import { useCallback, useRef, useState } from "react"
import type { Message, TraceStep } from "@/lib/types"
import { STREAM_EVENT, type StreamEvent } from "@/lib/streaming/types"
import { parseSSE } from "@/lib/streaming/utils"
import { streamChat } from "@/lib/api/chat"

export function useAgentStream() {
  const [messages, setMessages] = useState<Message[]>([])
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const applyEvent = useCallback((event: StreamEvent, assistantId: string) => {
    switch (event.type) {
      case STREAM_EVENT.TOKEN_DELTA:
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + event.content } : m))
        )
        break

      case STREAM_EVENT.TOOL_START:
        setTraceSteps((prev) => [
          ...prev,
          {
            id: event.toolCallId,
            toolName: event.toolName,
            args: event.args,
            status: "running",
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
                  status: "done",
                  endedAt: Date.now(),
                }
              : s
          )
        )
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

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content },
        { id: assistantId, role: "assistant", content: "", isStreaming: true },
      ])
      setTraceSteps([])
      setIsStreaming(true)
      setError(null)

      try {
        const res = await streamChat(content, abort.signal)

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
    setMessages([])
    setTraceSteps([])
    setError(null)
    setIsStreaming(false)
  }, [])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    messages,
    traceSteps,
    isStreaming,
    error,
    sendMessage,
    clearMessages,
    stopStreaming,
  }
}
