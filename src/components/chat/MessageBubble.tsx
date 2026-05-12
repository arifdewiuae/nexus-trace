import type { Message } from "@/lib/types"
import { cn } from "@/lib/utils"

function renderContent(text: string): React.ReactNode {
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line}
    </span>
  ))
}

type Props = { message: Message }

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {renderContent(message.content)}
        {message.isStreaming && (
          <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-current align-middle" />
        )}
      </div>
    </div>
  )
}
