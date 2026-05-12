"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, Square } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  onSend: (message: string) => void
  onStop: () => void
  isStreaming: boolean
}

export function ChatInput({ onSend, onStop, isStreaming }: Props) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [value])

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="shrink-0 border-t border-border px-4 py-3">
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-muted/50 px-3 py-2 focus-within:border-ring transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          rows={1}
          disabled={isStreaming}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-h-[24px] py-0.5 disabled:opacity-50"
        />
        <button
          onClick={isStreaming ? onStop : handleSend}
          disabled={!isStreaming && !value.trim()}
          className={cn(
            "shrink-0 rounded-lg p-1.5 transition-colors disabled:opacity-30",
            isStreaming
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed"
          )}
        >
          {isStreaming ? (
            <Square className="w-3.5 h-3.5" />
          ) : (
            <ArrowUp className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  )
}
