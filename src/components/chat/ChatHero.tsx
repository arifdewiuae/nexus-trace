import { Zap } from "lucide-react"
import { APP_NAME } from "@/lib/config"

// Welcome hero shown in the empty chat state.
export function ChatHero() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="relative">
        <div className="bg-primary/15 absolute inset-0 scale-150 rounded-full blur-2xl" />
        <div className="bg-primary/10 border-primary/20 relative rounded-2xl border p-4">
          <Zap className="text-primary h-8 w-8" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold tracking-tight">{APP_NAME}</h2>
        <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
          Ask anything — watch the AI agent search the web and reason through its answer live.
        </p>
      </div>
    </div>
  )
}
