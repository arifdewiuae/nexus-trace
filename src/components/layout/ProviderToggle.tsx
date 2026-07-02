"use client"

import { PROVIDER, type Provider } from "@/lib/config"
import { cn } from "@/lib/utils"

const OPTIONS: { value: Provider; label: string; hint: string }[] = [
  { value: PROVIDER.FIREWORKS, label: "Fireworks", hint: "Open models" },
  { value: PROVIDER.ANTHROPIC, label: "Claude", hint: "Anthropic" },
]

type Props = {
  value: Provider
  onChange: (provider: Provider) => void
}

// Segmented control that picks which LLM the agent runs on. The choice is per-user
// (persisted in the browser) and sent with each request.
export function ProviderToggle({ value, onChange }: Props) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Agent provider</label>
      <div className="border-input bg-background grid grid-cols-2 gap-1 rounded-lg border p-1">
        {OPTIONS.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={active}
              className={cn(
                "flex cursor-pointer flex-col items-center rounded-md px-3 py-1.5 transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-sm font-medium">{o.label}</span>
              <span className="text-xs opacity-70">{o.hint}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
