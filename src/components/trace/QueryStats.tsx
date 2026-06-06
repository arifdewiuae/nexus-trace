import { Fragment } from "react"
import type { TokenUsage } from "@/lib/types"
import { formatCost, formatTokenCount } from "@/lib/utils"

type Props = {
  usage: TokenUsage
  costUsd?: number | null
}

const Dot = <span className="text-muted-foreground/30">·</span>

// Per-query token breakdown (in / out / total) and estimated cost.
export function QueryStats({ usage, costUsd }: Props) {
  const stats = [
    { value: usage.inputTokens, label: "in" },
    { value: usage.outputTokens, label: "out" },
    { value: usage.totalTokens, label: "tokens" },
  ]

  return (
    <div className="border-border text-muted-foreground flex shrink-0 items-center gap-2 border-b px-4 py-2 text-xs">
      {stats.map((s, i) => (
        <Fragment key={s.label}>
          {i > 0 && Dot}
          <span className="tabular-nums">
            <span className="text-foreground/70">{formatTokenCount(s.value)}</span> {s.label}
          </span>
        </Fragment>
      ))}
      {costUsd != null && (
        <>
          {Dot}
          <span className="ml-auto font-mono text-emerald-400/90">~{formatCost(costUsd)}</span>
        </>
      )}
    </div>
  )
}
