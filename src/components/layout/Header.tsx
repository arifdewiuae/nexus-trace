import { Zap } from "lucide-react"

export function Header() {
  return (
    <header className="border-border flex shrink-0 items-center gap-2.5 border-b px-5 py-3">
      <Zap className="text-primary h-4 w-4" />
      <span className="text-sm font-semibold tracking-tight">Nexus Trace</span>
      <span className="text-muted-foreground ml-auto text-xs">Streaming AI Agent</span>
    </header>
  )
}
