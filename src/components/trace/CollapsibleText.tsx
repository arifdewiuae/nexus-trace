"use client"

import { Collapsible } from "./Collapsible"

type Props = {
  label: string
  text: string
  defaultOpen?: boolean
}

// Collapsible raw multi-line text (e.g. model reasoning).
export function CollapsibleText({ label, text, defaultOpen = false }: Props) {
  return (
    <Collapsible label={label} defaultOpen={defaultOpen}>
      <pre className="bg-background text-muted-foreground mt-1.5 max-h-64 overflow-auto whitespace-pre-wrap rounded-md p-2.5 font-mono text-xs leading-relaxed">
        {text}
      </pre>
    </Collapsible>
  )
}
