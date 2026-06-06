"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  label: string
  text: string
  defaultOpen?: boolean
}

// Like JsonViewer, but renders raw multi-line text (e.g. model reasoning) instead of JSON.
export function CollapsibleText({ label, text, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center gap-1 text-left text-sm transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <span className={cn("font-medium", open && "text-foreground")}>{label}</span>
      </button>

      {open && (
        <pre className="bg-background text-muted-foreground mt-1.5 max-h-64 overflow-auto whitespace-pre-wrap rounded-md p-2.5 font-mono text-xs leading-relaxed">
          {text}
        </pre>
      )}
    </div>
  )
}
