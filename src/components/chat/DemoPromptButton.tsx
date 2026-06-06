"use client"

import { ArrowRight } from "lucide-react"

type Props = {
  label: string
  prompt: string
  onSelect: (prompt: string) => void
}

// A single suggested-prompt card in the empty chat state.
export function DemoPromptButton({ label, prompt, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(prompt)}
      className="border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground group cursor-pointer rounded-xl border px-3.5 py-3 text-left transition-all"
    >
      <span className="text-foreground/50 mb-1 block text-[11px] font-medium uppercase tracking-wider">
        {label}
      </span>
      <span className="flex items-start justify-between gap-2 text-sm">
        <span className="line-clamp-2">{prompt}</span>
        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
    </button>
  )
}
