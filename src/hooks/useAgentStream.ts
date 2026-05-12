"use client"

import { useCallback, useRef, useState } from "react"
import type { Message, TraceStep } from "@/lib/types"
import { STREAM_EVENT } from "@/lib/streaming/types"
import { parseSSE } from "@/lib/streaming/utils"

export function useAgentStream() {
  const [messages, setMessages] = useState<Message[]>([])
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content }
    const assistantId = crypto.randomUUID()
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setTraceSteps([])
    setIsStreaming(true)
    setError(null)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
        signal: abort.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(data.error ?? "Request failed")
      }

      for await (const event of parseSSE(res)) {
        if (abort.signal.aborted) break

        switch (event.type) {
          case STREAM_EVENT.TOKEN_DELTA:
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.content }
                  : m
              )
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
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    } finally {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        )
      )
      setIsStreaming(false)
    }
  }, [])

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
