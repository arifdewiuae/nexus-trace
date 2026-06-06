import type { TokenUsage } from "@/lib/types"
import { formatCost, formatTokenCount } from "@/lib/utils"

type Props = {
  usage: TokenUsage
  costUsd?: number
}

// Running session totals across all queries.
export function SessionStats({ usage, costUsd }: Props) {
  return (
    <div className="border-border text-muted-foreground/60 flex shrink-0 items-center gap-2 border-t px-4 py-2 text-xs">
      <span>Session</span>
      <span className="text-muted-foreground/30">·</span>
      <span className="tabular-nums">{formatTokenCount(usage.totalTokens)} tokens</span>
      {(costUsd ?? 0) > 0 && (
        <>
          <span className="text-muted-foreground/30">·</span>
          <span className="font-mono tabular-nums">~{formatCost(costUsd ?? 0)}</span>
        </>
      )}
    </div>
  )
}
