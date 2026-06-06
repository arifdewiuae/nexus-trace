"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import { MAX_MESSAGE_LENGTH, TEXTAREA_MAX_HEIGHT_PX } from "@/lib/config"

// Show the counter only as the user nears the cap, to avoid clutter.
const COUNTER_VISIBLE_THRESHOLD = MAX_MESSAGE_LENGTH * 0.8

type Props = {
  onSend: (message: string) => void
  onStop: () => void
  isStreaming: boolean
  hasKeys: boolean
}

export function ChatInput({ onSend, onStop, isStreaming, hasKeys }: Props) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`
  }, [value])

  const trimmedLength = value.trim().length
  const isOverLimit = trimmedLength > MAX_MESSAGE_LENGTH
  const showCounter = trimmedLength >= COUNTER_VISIBLE_THRESHOLD

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming || isOverLimit) return
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
    <div className="border-border shrink-0 border-t px-4 py-3">
      <div className="border-border bg-muted/50 focus-within:border-ring flex items-end gap-2 rounded-2xl border px-3 py-2 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasKeys ? "Ask anything..." : "Add API keys in Settings ⚙️ to get started"}
          rows={1}
          disabled={isStreaming || !hasKeys}
          className="text-foreground placeholder:text-muted-foreground min-h-[28px] flex-1 resize-none bg-transparent py-0.5 text-base outline-none disabled:opacity-50"
        />
        <button
          onClick={isStreaming ? onStop : handleSend}
          disabled={!isStreaming && (!value.trim() || !hasKeys || isOverLimit)}
          aria-label={isStreaming ? "Stop generation" : "Send message"}
          className={cn(
            "shrink-0 cursor-pointer rounded-lg p-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
            isStreaming
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed"
          )}
        >
          {isStreaming ? <Square className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-2 text-xs">
        <span className="text-muted-foreground">Enter to send · Shift+Enter for newline</span>
        {showCounter && (
          <span
            aria-live="polite"
            className={cn("tabular-nums", isOverLimit ? "text-destructive" : "text-muted-foreground")}
          >
            {trimmedLength.toLocaleString()}/{MAX_MESSAGE_LENGTH.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}
