import { Trash2, Zap } from "lucide-react"
import type { ApiKeys } from "@/lib/types"
import { cn } from "@/lib/utils"
import { SettingsButton } from "./SettingsButton"

type Props = {
  onClear?: () => void
  canClear?: boolean
  keys: ApiKeys | null
  hasKeys: boolean
  onSaveKeys: (keys: ApiKeys) => void
  onClearKeys: () => void
}

export function Header({ onClear, canClear, keys, hasKeys, onSaveKeys, onClearKeys }: Props) {
  return (
    <header className="border-border flex shrink-0 items-center gap-2.5 border-b px-5 py-3">
      <Zap className="text-primary h-5 w-5" />
      <span className="text-base font-semibold tracking-tight">Nexus Trace</span>
      <span className="text-muted-foreground ml-auto text-sm">Streaming AI Agent</span>

      <SettingsButton keys={keys} hasKeys={hasKeys} onSave={onSaveKeys} onClear={onClearKeys} />

      {onClear && (
        <button
          onClick={onClear}
          disabled={!canClear}
          title="Clear conversation"
          aria-label="Clear conversation"
          className={cn(
            "text-muted-foreground hover:text-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors",
            "disabled:pointer-events-none disabled:opacity-30"
          )}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </header>
  )
}
