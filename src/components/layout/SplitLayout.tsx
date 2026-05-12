"use client"

import { useState } from "react"
import { Activity, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "chat" | "trace"

type Props = {
  chat: React.ReactNode
  trace: React.ReactNode
  isStreaming?: boolean
  hasTrace?: boolean
}

export function SplitLayout({ chat, trace, isStreaming, hasTrace }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("chat")

  return (
    <>
      {/* Desktop: side-by-side */}
      <div className="hidden h-full overflow-hidden md:flex">
        <div className="flex min-w-0 flex-1 flex-col">{chat}</div>
        <div className="border-border flex w-[420px] shrink-0 flex-col border-l">{trace}</div>
      </div>

      {/* Mobile: full-screen tabs */}
      <div className="flex h-full flex-col md:hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className={cn("h-full", activeTab !== "chat" && "hidden")}>{chat}</div>
          <div className={cn("h-full", activeTab !== "trace" && "hidden")}>{trace}</div>
        </div>

        {/* Tab bar */}
        <div className="border-border bg-background flex shrink-0 border-t">
          {(["chat", "trace"] as const).map((tab) => {
            const isActive = activeTab === tab
            const showDot = tab === "trace" && (isStreaming || hasTrace)
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "chat" ? (
                  <MessageSquare className="h-4 w-4" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
                <span className="capitalize">{tab}</span>
                {showDot && (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isStreaming ? "animate-pulse bg-emerald-400" : "bg-emerald-400/60"
                    )}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
