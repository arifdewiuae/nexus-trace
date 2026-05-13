"use client"

import { useState } from "react"
import { Settings } from "lucide-react"
import type { ApiKeys } from "@/lib/types"
import { cn } from "@/lib/utils"
import { SettingsModal } from "./SettingsModal"

type Props = {
  keys: ApiKeys | null
  hasKeys: boolean
  onSave: (keys: ApiKeys) => void
  onClear: () => void
}

export function SettingsButton({ keys, hasKeys, onSave, onClear }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="API key settings"
        className={cn(
          "relative cursor-pointer rounded-md p-1.5 transition-colors",
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
          onSave={onSave}
          onClear={onClear}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
