"use client"

import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Zap } from "lucide-react"
import type { Message } from "@/lib/types"
import { MessageBubble } from "./MessageBubble"
import { DEMO_PROMPTS } from "@/lib/demo-prompts"

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
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
        {/* Hero */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="bg-primary/15 absolute inset-0 scale-150 rounded-full blur-2xl" />
            <div className="bg-primary/10 border-primary/20 relative rounded-2xl border p-4">
              <Zap className="text-primary h-8 w-8" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-semibold tracking-tight">Nexus Trace</h2>
            <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
              Ask anything — watch the AI agent search the web and reason through its answer live.
            </p>
          </div>
        </div>

        {/* Demo prompts */}
        <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
          {DEMO_PROMPTS.map(({ label, prompt }) => (
            <button
              key={prompt}
              onClick={() => onPromptSelect(prompt)}
              className="border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground group cursor-pointer rounded-xl border px-3.5 py-3 text-left transition-all"
            >
              <span className="text-foreground/50 mb-1 block text-[11px] font-medium uppercase tracking-wider">
                {label}
              </span>
              <span className="flex items-start justify-between gap-2 text-sm">
                <span className="line-clamp-2">{prompt}</span>
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <MessageBubble message={message} />
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  )
}
