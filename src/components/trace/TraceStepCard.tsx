"use client"

import { motion } from "framer-motion"
import { BrainCircuit, Calendar, Search } from "lucide-react"
import type { TraceStep } from "@/lib/types"
import { TRACE_STATUS, STEP_TYPE } from "@/lib/types"
import { formatDuration } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { JsonViewer } from "./JsonViewer"
import { StatusIndicator } from "./StatusIndicator"

const TOOL_ICONS: Record<string, React.ReactNode> = {
  web_search: <Search className="h-3.5 w-3.5" />,
  get_current_datetime: <Calendar className="h-3.5 w-3.5" />,
}

const STATUS_BORDER: Record<TraceStep["status"], string> = {
  [TRACE_STATUS.RUNNING]: "border-amber-500/30",
  [TRACE_STATUS.DONE]: "border-emerald-500/20",
  [TRACE_STATUS.ERROR]: "border-destructive/30",
}

const MODEL_STATUS_BORDER: Record<TraceStep["status"], string> = {
  [TRACE_STATUS.RUNNING]: "border-violet-500/30",
  [TRACE_STATUS.DONE]: "border-violet-500/15",
  [TRACE_STATUS.ERROR]: "border-destructive/30",
}

type Props = {
  step: TraceStep
  index: number
}

export function TraceStepCard({ step, index }: Props) {
  const isModel = step.stepType === STEP_TYPE.MODEL
  const icon = isModel ? (
    <BrainCircuit className="h-3.5 w-3.5" />
  ) : (
    (TOOL_ICONS[step.toolName] ?? <Search className="h-3.5 w-3.5" />)
  )
  const borderClass = isModel ? MODEL_STATUS_BORDER[step.status] : STATUS_BORDER[step.status]

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className={cn("bg-card rounded-xl border px-3.5 py-3 text-sm", borderClass)}
    >
      <div className="flex items-center gap-2">
        <span className={cn(isModel ? "text-violet-400" : "text-muted-foreground")}>{icon}</span>
        <code
          className={cn(
            "flex-1 font-mono font-medium",
            isModel ? "text-violet-300" : "text-foreground"
          )}
        >
          {step.toolName}
        </code>
        <div className="text-muted-foreground flex items-center gap-1.5">
          {step.durationMs !== undefined && (
            <span className="text-[10px] tabular-nums">{formatDuration(step.durationMs)}</span>
          )}
          <StatusIndicator status={step.status} />
        </div>
      </div>

      {!isModel && (
        <div className="border-border mt-2.5 space-y-2 border-t pt-2.5">
          {step.args !== undefined && <JsonViewer label="Args" data={step.args} />}
          {step.result !== undefined && <JsonViewer label="Result" data={step.result} defaultOpen />}
        </div>
      )}
    </motion.div>
  )
}
