"use client"

import { useAgentStream } from "@/hooks/useAgentStream"
import { SplitLayout } from "@/components/layout/SplitLayout"
import { Header } from "@/components/layout/Header"
import { TracePanel } from "@/components/trace/TracePanel"
import { MessageList } from "./MessageList"
import { ChatInput } from "./ChatInput"
import { AlertCircle } from "lucide-react"

export function ChatContainer() {
  const { messages, traceSteps, isStreaming, error, sendMessage, stopStreaming } = useAgentStream()

  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex-1 overflow-hidden">
        <SplitLayout
          chat={
            <div className="flex h-full flex-col">
              {error && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive mx-4 mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}
              <MessageList messages={messages} onPromptSelect={sendMessage} />
              <ChatInput onSend={sendMessage} onStop={stopStreaming} isStreaming={isStreaming} />
            </div>
          }
          trace={<TracePanel steps={traceSteps} isStreaming={isStreaming} />}
        />
      </div>
    </div>
  )
}
