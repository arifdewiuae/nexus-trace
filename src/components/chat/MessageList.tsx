"use client"

import { useEffect, useRef } from "react"
import type { Message } from "@/lib/types"
import { MessageBubble } from "./MessageBubble"
import { DEMO_PROMPTS } from "@/lib/demo-prompts"
import { Zap } from "lucide-react"

type Props = {
  messages: Message[]
  onPromptSelect: (prompt: string) => void
}

export function MessageList({ messages, onPromptSelect }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Zap className="text-muted-foreground h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            Ask anything — the agent will search the web and show you every step.
          </p>
        </div>
        <div className="grid w-full max-w-sm grid-cols-1 gap-2">
          {DEMO_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPromptSelect(prompt)}
              className="text-muted-foreground border-border hover:bg-muted hover:text-foreground rounded-xl border px-3 py-2 text-left text-xs transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
