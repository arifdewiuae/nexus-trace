import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { TRACE_STATUS, type TraceStepStatus } from "@/lib/types"

type Props = { status: TraceStepStatus }

// Record (not an if-chain) so adding a TRACE_STATUS forces a matching icon at compile time.
const STATUS_ICON: Record<TraceStepStatus, React.ReactNode> = {
  [TRACE_STATUS.RUNNING]: <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />,
  [TRACE_STATUS.DONE]: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  [TRACE_STATUS.ERROR]: <XCircle className="text-destructive h-3.5 w-3.5" />,
}

export function StatusIndicator({ status }: Props) {
  return STATUS_ICON[status]
}
