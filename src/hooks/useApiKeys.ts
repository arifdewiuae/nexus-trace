"use client"

import { useCallback, useEffect, useState } from "react"
import type { ApiKeys } from "@/lib/types"
import { STORAGE_KEY_API_KEYS } from "@/lib/config"

function readKeys(): ApiKeys | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_API_KEYS)
    return raw ? (JSON.parse(raw) as ApiKeys) : null
  } catch {
    return null
  }
}

export function useApiKeys() {
  const [keys, setKeysState] = useState<ApiKeys | null>(null)

  useEffect(() => {
    setKeysState(readKeys())
  }, [])

  const setKeys = useCallback((next: ApiKeys) => {
    localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify(next))
    setKeysState(next)
  }, [])

  const clearKeys = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_API_KEYS)
    setKeysState(null)
  }, [])

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_KEYS_ENABLED === "true"
  const hasKeys = isDemoMode || Boolean(keys?.fireworksKey.trim() && keys?.tavilyKey.trim())

  return { keys, setKeys, clearKeys, hasKeys }
}
