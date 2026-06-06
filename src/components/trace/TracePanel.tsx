import type { TraceStep, TokenUsage } from "@/lib/types"
import { TracePanelHeader } from "./TracePanelHeader"
import { QueryStats } from "./QueryStats"
import { SessionStats } from "./SessionStats"
import { TraceStepList } from "./TraceStepList"

type Props = {
  steps: readonly TraceStep[]
  isStreaming: boolean
  totalLatencyMs: number | null
  ttftMs?: number | null
  queryUsage?: TokenUsage | null
  queryCostUsd?: number | null
  sessionUsage?: TokenUsage
  sessionCostUsd?: number
}

export function TracePanel({
  steps,
  isStreaming,
  totalLatencyMs,
  ttftMs,
  queryUsage,
  queryCostUsd,
  sessionUsage,
  sessionCostUsd,
}: Props) {
  const hasSessionData = (sessionUsage?.totalTokens ?? 0) > 0

  return (
    <div className="flex h-full flex-col">
      <TracePanelHeader
        stepCount={steps.length}
        isStreaming={isStreaming}
        totalLatencyMs={totalLatencyMs}
        ttftMs={ttftMs}
      />

      {queryUsage && !isStreaming && <QueryStats usage={queryUsage} costUsd={queryCostUsd} />}

      <TraceStepList steps={steps} isStreaming={isStreaming} />

      {hasSessionData && sessionUsage && (
        <SessionStats usage={sessionUsage} costUsd={sessionCostUsd} />
      )}
    </div>
  )
}
