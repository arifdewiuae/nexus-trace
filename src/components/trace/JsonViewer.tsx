"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  label: string
  data: unknown
  defaultOpen?: boolean
}

export function JsonViewer({ label, data, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1 text-left text-sm transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <span className={cn("font-medium", open && "text-foreground")}>{label}</span>
      </button>

      {open && (
        <pre className="bg-background text-muted-foreground mt-1.5 overflow-x-auto rounded-md p-2.5 font-mono text-xs leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}
