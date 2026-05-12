"use client"

import { useEffect, useRef } from "react"
import type { Message } from "@/lib/types"
import { MessageBubble } from "./MessageBubble"
import { DEMO_PROMPTS } from "@/lib/demo-prompts"
import { Zap } from "lucide-react"

type Props = {
  messages: Message[]
  isStreaming: boolean
  onPromptSelect: (prompt: string) => void
}

export function MessageList({ messages, isStreaming, onPromptSelect }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Zap className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Ask anything — the agent will search the web and show you every step.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
          {DEMO_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPromptSelect(prompt)}
              className="text-left text-xs text-muted-foreground border border-border rounded-xl px-3 py-2 hover:bg-muted hover:text-foreground transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
