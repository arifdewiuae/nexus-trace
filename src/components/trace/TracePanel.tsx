"use client"

import { Activity } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import type { TraceStep, TokenUsage } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { formatDuration, formatCost, formatTokenCount } from "@/lib/utils"
import { TraceStepCard } from "./TraceStepCard"

type Props = {
  steps: TraceStep[]
  isStreaming: boolean
  totalLatencyMs: number | null
  queryUsage?: TokenUsage | null
  queryCostUsd?: number | null
  sessionUsage?: TokenUsage
  sessionCostUsd?: number
}

export function TracePanel({
  steps,
  isStreaming,
  totalLatencyMs,
  queryUsage,
  queryCostUsd,
  sessionUsage,
  sessionCostUsd,
}: Props) {
  const hasSessionData = (sessionUsage?.totalTokens ?? 0) > 0

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

      {/* Per-query token stats */}
      {queryUsage && !isStreaming && (
        <div className="border-border text-muted-foreground flex shrink-0 items-center gap-2 border-b px-4 py-2 text-xs">
          <span className="tabular-nums">
            <span className="text-foreground/70">{formatTokenCount(queryUsage.inputTokens)}</span>
            {" in"}
          </span>
          <span className="text-muted-foreground/30">·</span>
          <span className="tabular-nums">
            <span className="text-foreground/70">{formatTokenCount(queryUsage.outputTokens)}</span>
            {" out"}
          </span>
          <span className="text-muted-foreground/30">·</span>
          <span className="tabular-nums">
            <span className="text-foreground/70">{formatTokenCount(queryUsage.totalTokens)}</span>
            {" tokens"}
          </span>
          {queryCostUsd != null && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="ml-auto font-mono text-emerald-400/90">
                ~{formatCost(queryCostUsd)}
              </span>
            </>
          )}
        </div>
      )}

      {/* Steps */}
      {steps.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          {isStreaming ? (
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="bg-muted-foreground/40 h-1.5 w-1.5 rounded-full"
                  style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Run a query to see the agent trace</p>
          )}
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

      {/* Session totals */}
      {hasSessionData && sessionUsage && (
        <div className="border-border text-muted-foreground/60 flex shrink-0 items-center gap-2 border-t px-4 py-2 text-xs">
          <span>Session</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="tabular-nums">{formatTokenCount(sessionUsage.totalTokens)} tokens</span>
          {(sessionCostUsd ?? 0) > 0 && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="tabular-nums font-mono">~{formatCost(sessionCostUsd ?? 0)}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
