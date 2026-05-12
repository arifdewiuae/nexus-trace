"use client"

import { useAgentStream } from "@/hooks/useAgentStream"
import { SplitLayout } from "@/components/layout/SplitLayout"
import { Header } from "@/components/layout/Header"
import { TracePanel } from "@/components/trace/TracePanel"
import { MessageList } from "./MessageList"
import { ChatInput } from "./ChatInput"
import { AlertCircle, X } from "lucide-react"

export function ChatContainer() {
  const {
    messages,
    traceSteps,
    isStreaming,
    totalLatencyMs,
    error,
    sendMessage,
    clearMessages,
    clearError,
    stopStreaming,
  } = useAgentStream()

  return (
    <div className="flex h-full flex-col">
      <Header onClear={clearMessages} canClear={messages.length > 0 && !isStreaming} />
      <div className="flex-1 overflow-hidden">
        <SplitLayout
          chat={
            <div className="flex h-full flex-col">
              {error && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive mx-4 mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button
                    onClick={clearError}
                    className="hover:text-destructive/70 cursor-pointer transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <MessageList messages={messages} onPromptSelect={sendMessage} />
              <ChatInput onSend={sendMessage} onStop={stopStreaming} isStreaming={isStreaming} />
            </div>
          }
          isStreaming={isStreaming}
          hasTrace={traceSteps.length > 0}
          trace={
            <TracePanel steps={traceSteps} isStreaming={isStreaming} totalLatencyMs={totalLatencyMs} />
          }
        />
      </div>
    </div>
  )
}
