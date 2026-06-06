import { Fragment } from "react"
import type { TokenUsage } from "@/lib/types"
import { formatCost, formatTokenCount } from "@/lib/utils"

type Props = {
  usage: TokenUsage
  costUsd?: number
}

const Dot = <span className="text-muted-foreground/30">·</span>

// The single source of truth for token/cost — session totals (input, output, total, cost).
export function SessionStats({ usage, costUsd }: Props) {
  const stats = [
    { value: usage.inputTokens, label: "in" },
    { value: usage.outputTokens, label: "out" },
    { value: usage.totalTokens, label: "tokens" },
  ]

  return (
    <div className="border-border text-muted-foreground flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-t px-4 py-2 text-xs">
      <span className="text-muted-foreground/60">Session</span>
      {stats.map((s) => (
        <Fragment key={s.label}>
          {Dot}
          <span className="tabular-nums">
            <span className="text-foreground/70">{formatTokenCount(s.value)}</span> {s.label}
          </span>
        </Fragment>
      ))}
      {(costUsd ?? 0) > 0 && (
        <>
          {Dot}
          <span className="ml-auto font-mono text-emerald-400/90">~{formatCost(costUsd ?? 0)}</span>
        </>
      )}
    </div>
  )
}
