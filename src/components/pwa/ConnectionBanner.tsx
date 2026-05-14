"use client"

import { useSyncExternalStore } from "react"
import { WifiOff } from "lucide-react"

function subscribe(cb: () => void) {
  window.addEventListener("online", cb)
  window.addEventListener("offline", cb)
  return () => {
    window.removeEventListener("online", cb)
    window.removeEventListener("offline", cb)
  }
}

export function ConnectionBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-destructive/90 fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>No internet connection — queries are paused</span>
    </div>
  )
}
