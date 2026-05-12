"use client"

import { Activity } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import type { TraceStep } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { formatDuration } from "@/lib/utils"
import { TraceStepCard } from "./TraceStepCard"

type Props = {
  steps: TraceStep[]
  isStreaming: boolean
  totalLatencyMs: number | null
}

export function TracePanel({ steps, isStreaming, totalLatencyMs }: Props) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <Activity className="text-muted-foreground h-4 w-4" />
        <span className="text-base font-medium">Trace</span>

        <div className="ml-auto flex items-center gap-2">
          {totalLatencyMs !== null && !isStreaming && (
            <span className="text-muted-foreground tabular-nums text-xs">
              {formatDuration(totalLatencyMs)} total
            </span>
          )}
          {steps.length > 0 && (
            <Badge variant="secondary" className="text-xs tabular-nums">
              {steps.length} step{steps.length > 1 ? "s" : ""}
            </Badge>
          )}
          {isStreaming && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          )}
        </div>
      </div>

      {/* Steps */}
      {steps.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground text-sm">
            {isStreaming ? "Waiting for tool calls…" : "Run a query to see the agent trace"}
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          <AnimatePresence initial={false}>
            {steps.map((step, i) => (
              <TraceStepCard key={step.id} step={step} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
