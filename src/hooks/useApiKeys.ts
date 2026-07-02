"use client"

import { useCallback, useSyncExternalStore } from "react"
import type { ApiKeys } from "@/lib/types"
import {
  STORAGE_KEY_API_KEYS,
  STORAGE_KEY_PROVIDER,
  PROVIDER,
  type Provider,
  resolveProvider,
} from "@/lib/config"

// Deploy default from NEXT_PUBLIC_LLM_PROVIDER; the user's stored choice overrides it at runtime.
export const DEFAULT_PROVIDER = resolveProvider(process.env.NEXT_PUBLIC_LLM_PROVIDER)

// The LLM key the given provider needs (Anthropic or Fireworks).
export function llmKeyOf(keys: ApiKeys | null | undefined, provider: Provider): string | undefined {
  return provider === PROVIDER.ANTHROPIC ? keys?.anthropicKey : keys?.fireworksKey
}

// useSyncExternalStore requires a referentially-stable snapshot: parsing on every call
// would return a fresh object each render and re-render-loop. Cache by the raw string and
// only re-parse when it actually changes.
let cachedRaw: string | null = null
let cachedKeys: ApiKeys | null = null

function readKeys(): ApiKeys | null {
  if (typeof window === "undefined") return null

  let raw: string | null
  try {
    raw = localStorage.getItem(STORAGE_KEY_API_KEYS)
  } catch (err) {
    console.warn("[useApiKeys] could not read API keys from localStorage:", err)
    return null
  }

  if (raw === cachedRaw) return cachedKeys
  cachedRaw = raw
  try {
    cachedKeys = raw ? (JSON.parse(raw) as ApiKeys) : null
  } catch (err) {
    console.warn("[useApiKeys] stored API keys are corrupt; ignoring them:", err)
    cachedKeys = null
  }
  return cachedKeys
}

// Provider snapshot is a primitive string, so it's inherently stable — no caching needed.
function readProvider(): Provider {
  if (typeof window === "undefined") return DEFAULT_PROVIDER
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROVIDER)
    return raw ? resolveProvider(raw) : DEFAULT_PROVIDER
  } catch {
    return DEFAULT_PROVIDER
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb)
  return () => window.removeEventListener("storage", cb)
}

// The listener ignores the event's key, so any dispatch re-reads both keys and provider.
function notifyStorage() {
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY_API_KEYS }))
}

export function useApiKeys() {
  // useSyncExternalStore handles SSR (getServerSnapshot → default) and syncs
  // across tabs via the storage event — no useEffect or hydration workaround needed.
  const keys = useSyncExternalStore(subscribe, readKeys, () => null)
  const provider = useSyncExternalStore(subscribe, readProvider, () => DEFAULT_PROVIDER)

  const setKeys = useCallback((next: ApiKeys) => {
    localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify(next))
    notifyStorage()
  }, [])

  const setProvider = useCallback((next: Provider) => {
    localStorage.setItem(STORAGE_KEY_PROVIDER, next)
    notifyStorage()
  }, [])

  const clearKeys = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_API_KEYS)
    notifyStorage()
  }, [])

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_KEYS_ENABLED === "true"
  const hasKeys = isDemoMode || Boolean(llmKeyOf(keys, provider)?.trim() && keys?.tavilyKey.trim())

  return { keys, provider, setKeys, setProvider, clearKeys, hasKeys }
}
