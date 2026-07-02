"use client"

import { useState } from "react"
import { Settings } from "lucide-react"
import type { ApiKeys } from "@/lib/types"
import type { Provider } from "@/lib/config"
import { cn } from "@/lib/utils"
import { SettingsModal } from "./SettingsModal"

type Props = {
  keys: ApiKeys | null
  provider: Provider
  hasKeys: boolean
  onSave: (keys: ApiKeys) => void
  onSetProvider: (provider: Provider) => void
  onClear: () => void
}

export function SettingsButton({ keys, provider, hasKeys, onSave, onSetProvider, onClear }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="API key settings"
        aria-label="API key settings"
        className={cn(
          "relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors",
          "text-muted-foreground hover:text-foreground"
        )}
      >
        <Settings className="h-4 w-4" />
        {!hasKeys && (
          <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-amber-400" />
        )}
      </button>

      {open && (
        <SettingsModal
          keys={keys}
          provider={provider}
          onSave={onSave}
          onSetProvider={onSetProvider}
          onClear={onClear}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
