import { WifiOff } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
        <WifiOff className="text-muted-foreground h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">You&apos;re offline</h1>
        <p className="text-muted-foreground text-sm">
          Nexus Trace needs a connection to run the AI agent. Reconnect and
          refresh to continue.
        </p>
      </div>
    </div>
  )
}
