"use client"

import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Message } from "@/lib/types"
import { MessageBubble } from "./MessageBubble"
import { EmptyState } from "./EmptyState"

type Props = {
  messages: readonly Message[]
  onPromptSelect: (prompt: string) => void
}

export function MessageList({ messages, onPromptSelect }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Smooth-scroll when a message is added, but jump instantly while tokens stream in —
    // otherwise every token kicks off a fresh smooth-scroll and the view janks.
    const isStreaming = messages[messages.length - 1]?.isStreaming
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth" })
  }, [messages])

  if (messages.length === 0) {
    return <EmptyState onPromptSelect={onPromptSelect} />
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
