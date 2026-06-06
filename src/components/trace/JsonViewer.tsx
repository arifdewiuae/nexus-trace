"use client"

import { Collapsible } from "./Collapsible"

type Props = {
  label: string
  data: unknown
  defaultOpen?: boolean
}

// Collapsible pretty-printed JSON (tool args/results).
export function JsonViewer({ label, data, defaultOpen = false }: Props) {
  return (
    <Collapsible label={label} defaultOpen={defaultOpen}>
      <pre className="bg-background text-muted-foreground mt-1.5 overflow-x-auto rounded-md p-2.5 font-mono text-xs leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </Collapsible>
  )
}
