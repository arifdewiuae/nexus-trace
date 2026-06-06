"use client"

import { useState } from "react"
import { Eye, EyeOff, ExternalLink } from "lucide-react"

type Props = {
  label: string
  // Used in the show/hide aria-label, e.g. "Show Fireworks key".
  name: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  getKeyUrl: string
  // Optional muted suffix after the label, e.g. "(optional - content moderation)".
  note?: string
}

// One labelled API-key field with a "Get a key" link and a show/hide toggle.
// Visibility is local state — each field manages its own independently.
export function ApiKeyInput({ label, name, value, onChange, placeholder, getKeyUrl, note }: Props) {
  const [show, setShow] = useState(false)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          {label}
          {note && <span className="text-muted-foreground font-normal"> {note}</span>}
        </label>
        <a
          href={getKeyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
        >
          Get a key <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="border-input bg-background focus-within:border-ring flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="placeholder:text-muted-foreground/50 min-w-0 flex-1 bg-transparent text-sm outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? `Hide ${name} key` : `Show ${name} key`}
          className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
