"use client"

import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"

export function ConnectionBanner() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)

    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

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
