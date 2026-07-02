import { Activity, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatDuration } from "@/lib/utils"
import { langsmithRunUrl } from "@/lib/config"

type Props = {
  stepCount: number
  isStreaming: boolean
  totalLatencyMs: number | null
  ttftMs?: number | null
  langsmithRunId?: string | null
}

// Only render the LangSmith link in development — it's a debugging affordance.
const IS_DEV = process.env.NODE_ENV === "development"

// Trace panel header: title, latency summary, step-count badge, live indicator.
export function TracePanelHeader({
  stepCount,
  isStreaming,
  totalLatencyMs,
  ttftMs,
  langsmithRunId,
}: Props) {
  return (
    <div className="border-border flex shrink-0 items-center gap-2 border-b px-4 py-3">
      <Activity className="text-muted-foreground h-4 w-4" />
      <span className="text-base font-medium">Trace</span>

      <div className="ml-auto flex items-center gap-2">
        {IS_DEV && langsmithRunId && !isStreaming && (
          <a
            href={langsmithRunUrl(langsmithRunId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
            title="Open this run in LangSmith (dev only)"
          >
            LangSmith <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {totalLatencyMs !== null && !isStreaming && (
          <span className="text-muted-foreground text-xs tabular-nums">
            {ttftMs != null && (
              <>
                <span title="Time to first token">{formatDuration(ttftMs)} TTFT</span>
                <span className="mx-1 opacity-30">·</span>
              </>
            )}
            {formatDuration(totalLatencyMs)} total
          </span>
        )}
        {stepCount > 0 && (
          <Badge variant="secondary" className="text-xs tabular-nums">
            {stepCount} step{stepCount > 1 ? "s" : ""}
          </Badge>
        )}
        {isStreaming && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />}
      </div>
    </div>
  )
}
