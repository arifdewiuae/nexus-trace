"use client"

import { useState } from "react"
import { X, Eye, EyeOff, ExternalLink } from "lucide-react"
import type { ApiKeys } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  keys: ApiKeys | null
  onSave: (keys: ApiKeys) => void
  onClear: () => void
  onClose: () => void
}

export function SettingsModal({ keys, onSave, onClear, onClose }: Props) {
  const [fireworksKey, setFireworksKey] = useState(keys?.fireworksKey ?? "")
  const [tavilyKey, setTavilyKey] = useState(keys?.tavilyKey ?? "")
  const [showFireworks, setShowFireworks] = useState(false)
  const [showTavily, setShowTavily] = useState(false)

  const canSave = fireworksKey.trim().length > 0 && tavilyKey.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({ fireworksKey: fireworksKey.trim(), tavilyKey: tavilyKey.trim() })
    onClose()
  }

  const handleClear = () => {
    setFireworksKey("")
    setTavilyKey("")
    onClear()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="bg-card border-border relative w-full max-w-md rounded-2xl border shadow-2xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">API Keys</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer rounded-lg p-1.5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-5 py-5">
          <p className="text-muted-foreground text-sm">
            Keys are stored only in your browser and sent directly to the APIs over HTTPS. They
            never touch any database.
          </p>

          {/* Fireworks Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Fireworks AI key</label>
              <a
                href="https://app.fireworks.ai/settings/users/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              >
                Get a key <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="border-input bg-background focus-within:border-ring flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors">
              <input
                type={showFireworks ? "text" : "password"}
                value={fireworksKey}
                onChange={(e) => setFireworksKey(e.target.value)}
                placeholder="fw_..."
                className="placeholder:text-muted-foreground/50 min-w-0 flex-1 bg-transparent text-sm outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowFireworks((v) => !v)}
                className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer transition-colors"
              >
                {showFireworks ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Tavily Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Tavily API key</label>
              <a
                href="https://app.tavily.com/home"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              >
                Get a key <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="border-input bg-background focus-within:border-ring flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors">
              <input
                type={showTavily ? "text" : "password"}
                value={tavilyKey}
                onChange={(e) => setTavilyKey(e.target.value)}
                placeholder="tvly-..."
                className="placeholder:text-muted-foreground/50 min-w-0 flex-1 bg-transparent text-sm outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowTavily((v) => !v)}
                className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer transition-colors"
              >
                {showTavily ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-between border-t px-5 py-4">
          <button
            onClick={handleClear}
            disabled={!keys}
            className={cn(
              "text-muted-foreground hover:text-destructive cursor-pointer text-sm transition-colors",
              "disabled:pointer-events-none disabled:opacity-30"
            )}
          >
            Clear keys
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              "disabled:pointer-events-none disabled:opacity-40"
            )}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
