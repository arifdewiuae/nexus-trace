"use client"

import { useAgentStream } from "@/hooks/useAgentStream"
import { SplitLayout } from "@/components/layout/SplitLayout"
import { Header } from "@/components/layout/Header"
import { MessageList } from "./MessageList"
import { ChatInput } from "./ChatInput"
import { AlertCircle } from "lucide-react"

export function ChatContainer() {
  const { 
    messages,
    traceSteps,
    isStreaming,
    error,
    sendMessage,
    stopStreaming
  } = useAgentStream()

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 overflow-hidden">
        <SplitLayout
          chat={
            <div className="flex flex-col h-full">
              {error && (
                <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}
              <MessageList
                messages={messages}
                isStreaming={isStreaming}
                onPromptSelect={sendMessage}
              />
              <ChatInput
                onSend={sendMessage}
                onStop={stopStreaming}
                isStreaming={isStreaming}
              />
            </div>
          }
          trace={
            <div className="flex flex-col h-full items-center justify-center gap-2">
              <p className="text-xs text-muted-foreground">
                {traceSteps.length === 0
                  ? "Trace steps will appear here"
                  : `${traceSteps.length} step${traceSteps.length > 1 ? "s" : ""}`}
              </p>
            </div>
          }
        />
      </div>
    </div>
  )
}
