"use client"

import { useState } from "react"
import { X } from "lucide-react"
import type { ApiKeys } from "@/lib/types"
import { cn } from "@/lib/utils"
import { FIREWORKS_KEYS_URL, TAVILY_KEYS_URL, OPENAI_KEYS_URL } from "@/lib/config"
import { ApiKeyInput } from "./ApiKeyInput"

type Props = {
  keys: ApiKeys | null
  onSave: (keys: ApiKeys) => void
  onClear: () => void
  onClose: () => void
}

export function SettingsModal({ keys, onSave, onClear, onClose }: Props) {
  const [fireworksKey, setFireworksKey] = useState(keys?.fireworksKey ?? "")
  const [tavilyKey, setTavilyKey] = useState(keys?.tavilyKey ?? "")
  const [openaiKey, setOpenaiKey] = useState(keys?.openaiKey ?? "")

  const canSave = fireworksKey.trim().length > 0 && tavilyKey.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    const saved: Parameters<typeof onSave>[0] = {
      fireworksKey: fireworksKey.trim(),
      tavilyKey: tavilyKey.trim(),
    }
    if (openaiKey.trim()) saved.openaiKey = openaiKey.trim()
    onSave(saved)
    onClose()
  }

  const handleClear = () => {
    setFireworksKey("")
    setTavilyKey("")
    setOpenaiKey("")
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
            aria-label="Close settings"
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

          <ApiKeyInput
            label="Fireworks AI key"
            name="Fireworks"
            value={fireworksKey}
            onChange={setFireworksKey}
            placeholder="fw_..."
            getKeyUrl={FIREWORKS_KEYS_URL}
          />

          <ApiKeyInput
            label="Tavily API key"
            name="Tavily"
            value={tavilyKey}
            onChange={setTavilyKey}
            placeholder="tvly-..."
            getKeyUrl={TAVILY_KEYS_URL}
          />

          <ApiKeyInput
            label="OpenAI key"
            name="OpenAI"
            value={openaiKey}
            onChange={setOpenaiKey}
            placeholder="sk-..."
            getKeyUrl={OPENAI_KEYS_URL}
            note="(optional - content moderation)"
          />
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
