"use client"

import { useCallback, useSyncExternalStore } from "react"
import type { ApiKeys } from "@/lib/types"
import { STORAGE_KEY_API_KEYS } from "@/lib/config"

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

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb)
  return () => window.removeEventListener("storage", cb)
}

function notifyStorage() {
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY_API_KEYS }))
}

export function useApiKeys() {
  // useSyncExternalStore handles SSR (getServerSnapshot → null) and syncs
  // across tabs via the storage event — no useEffect or hydration workaround needed.
  const keys = useSyncExternalStore(subscribe, readKeys, () => null)

  const setKeys = useCallback((next: ApiKeys) => {
    localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify(next))
    notifyStorage()
  }, [])

  const clearKeys = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_API_KEYS)
    notifyStorage()
  }, [])

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_KEYS_ENABLED === "true"
  const hasKeys = isDemoMode || Boolean(keys?.fireworksKey.trim() && keys?.tavilyKey.trim())

  return { keys, setKeys, clearKeys, hasKeys }
}
