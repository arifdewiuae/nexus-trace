"use client"

import { useState } from "react"
import type { ApiKeys } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  PROVIDER,
  type Provider,
  FIREWORKS_KEYS_URL,
  ANTHROPIC_KEYS_URL,
  TAVILY_KEYS_URL,
  OPENAI_KEYS_URL,
} from "@/lib/config"
import { Modal } from "@/components/ui/Modal"
import { ApiKeyInput } from "./ApiKeyInput"
import { ProviderToggle } from "./ProviderToggle"

// In demo mode the server supplies keys, so the user's own keys are optional.
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_KEYS_ENABLED === "true"

type Props = {
  keys: ApiKeys | null
  provider: Provider
  onSave: (keys: ApiKeys) => void
  onSetProvider: (provider: Provider) => void
  onClear: () => void
  onClose: () => void
}

export function SettingsModal({ keys, provider, onSave, onSetProvider, onClear, onClose }: Props) {
  const [selected, setSelected] = useState<Provider>(provider)
  // Both provider keys are held so a user can save one, switch, and save the other — keeping both.
  const [fireworksKey, setFireworksKey] = useState(keys?.fireworksKey ?? "")
  const [anthropicKey, setAnthropicKey] = useState(keys?.anthropicKey ?? "")
  const [tavilyKey, setTavilyKey] = useState(keys?.tavilyKey ?? "")
  const [openaiKey, setOpenaiKey] = useState(keys?.openaiKey ?? "")

  const isAnthropic = selected === PROVIDER.ANTHROPIC
  const llmKey = isAnthropic ? anthropicKey : fireworksKey
  const canSave = IS_DEMO || (llmKey.trim().length > 0 && tavilyKey.trim().length > 0)

  const handleSave = () => {
    if (!canSave) return
    // The provider choice always persists (it's the point of this modal, and it's all that's
    // needed in demo mode where the server supplies keys).
    onSetProvider(selected)
    const saved: ApiKeys = { tavilyKey: tavilyKey.trim() }
    if (fireworksKey.trim()) saved.fireworksKey = fireworksKey.trim()
    if (anthropicKey.trim()) saved.anthropicKey = anthropicKey.trim()
    if (openaiKey.trim()) saved.openaiKey = openaiKey.trim()
    // A BYO key set is only usable with BOTH an LLM key and a Tavily key (the web_search tool
    // needs Tavily regardless of provider). Persist keys only when that complete pair exists —
    // otherwise leave any existing stored keys untouched and just save the provider choice.
    if (saved.tavilyKey && (saved.fireworksKey || saved.anthropicKey)) onSave(saved)
    onClose()
  }

  const handleClear = () => {
    setFireworksKey("")
    setAnthropicKey("")
    setTavilyKey("")
    setOpenaiKey("")
    onClear()
  }

  const footer = (
    <>
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
    </>
  )

  return (
    <Modal title="Settings" onClose={onClose} footer={footer}>
      <p className="text-muted-foreground text-sm">
        Pick the LLM the agent runs on, and (optionally) bring your own keys. Keys are stored only in
        your browser and sent directly to the APIs over HTTPS. They never touch any database.
      </p>

      <ProviderToggle value={selected} onChange={setSelected} />

      {isAnthropic ? (
        <ApiKeyInput
          label="Anthropic API key"
          name="Anthropic"
          value={anthropicKey}
          onChange={setAnthropicKey}
          placeholder="sk-ant-..."
          getKeyUrl={ANTHROPIC_KEYS_URL}
          note={IS_DEMO ? "(optional in demo mode)" : undefined}
        />
      ) : (
        <ApiKeyInput
          label="Fireworks AI key"
          name="Fireworks"
          value={fireworksKey}
          onChange={setFireworksKey}
          placeholder="fw_..."
          getKeyUrl={FIREWORKS_KEYS_URL}
          note={IS_DEMO ? "(optional in demo mode)" : undefined}
        />
      )}

      <ApiKeyInput
        label="Tavily API key"
        name="Tavily"
        value={tavilyKey}
        onChange={setTavilyKey}
        placeholder="tvly-..."
        getKeyUrl={TAVILY_KEYS_URL}
        note={IS_DEMO ? "(optional in demo mode)" : undefined}
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
    </Modal>
  )
}
