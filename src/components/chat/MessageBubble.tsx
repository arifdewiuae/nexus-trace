import ReactMarkdown from "react-markdown"
import type { Message } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = { message: Message }

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-base leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <div
            className="prose prose-invert prose-sm max-w-none
              prose-p:my-1 prose-p:leading-relaxed
              prose-headings:mt-3 prose-headings:mb-1 prose-headings:font-semibold
              prose-ul:my-1 prose-ul:pl-4 prose-ol:my-1 prose-ol:pl-4
              prose-li:my-0.5
              prose-strong:font-semibold
              prose-blockquote:border-l-2 prose-blockquote:border-muted-foreground/40 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-muted-foreground
              prose-code:bg-background/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
              prose-pre:bg-background/60 prose-pre:rounded-lg
              prose-table:text-sm prose-th:font-semibold prose-td:py-1
              prose-hr:border-border"
          >
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {message.isStreaming && (
          <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-current align-middle" />
        )}
      </div>
    </div>
  )
}
