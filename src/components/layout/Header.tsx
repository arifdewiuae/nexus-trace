import { Zap } from "lucide-react"

export function Header() {
  return (
    <header className="shrink-0 border-b border-border px-5 py-3 flex items-center gap-2.5">
      <Zap className="w-4 h-4 text-primary" />
      <span className="font-semibold tracking-tight text-sm">Nexus Trace</span>
      <span className="ml-auto text-xs text-muted-foreground">
        Streaming AI Agent
      </span>
    </header>
  )
}
