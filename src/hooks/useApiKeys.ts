"use client"

import { useCallback, useSyncExternalStore } from "react"
import type { ApiKeys } from "@/lib/types"
import { STORAGE_KEY_API_KEYS } from "@/lib/config"

function readKeys(): ApiKeys | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_API_KEYS)
    return raw ? (JSON.parse(raw) as ApiKeys) : null
  } catch {
    return null
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb)
  return () => window.removeEventListener("storage", cb)
}

export function useApiKeys() {
  // useSyncExternalStore handles SSR (getServerSnapshot → null) and syncs
  // across tabs via the storage event — no useEffect or hydration workaround needed.
  const keys = useSyncExternalStore(subscribe, readKeys, () => null)

  const setKeys = useCallback((next: ApiKeys) => {
    localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify(next))
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY_API_KEYS }))
  }, [])

  const clearKeys = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_API_KEYS)
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY_API_KEYS }))
  }, [])

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_KEYS_ENABLED === "true"
  const hasKeys = isDemoMode || Boolean(keys?.fireworksKey.trim() && keys?.tavilyKey.trim())

  return { keys, setKeys, clearKeys, hasKeys }
}
