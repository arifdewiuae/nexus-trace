import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { TRACE_STATUS, type TraceStepStatus } from "@/lib/types"

type Props = { status: TraceStepStatus }

export function StatusIndicator({ status }: Props) {
  if (status === TRACE_STATUS.RUNNING) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
  }
  if (status === TRACE_STATUS.ERROR) {
    return <XCircle className="text-destructive h-3.5 w-3.5" />
  }
  return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
}
