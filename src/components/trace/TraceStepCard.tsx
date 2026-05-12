"use client"

import { motion } from "framer-motion"
import { Search } from "lucide-react"
import type { TraceStep } from "@/lib/types"
import { TRACE_STATUS } from "@/lib/types"
import { formatDuration } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { JsonViewer } from "./JsonViewer"
import { StatusIndicator } from "./StatusIndicator"

const TOOL_ICONS: Record<string, React.ReactNode> = {
  web_search: <Search className="h-3.5 w-3.5" />,
}

const STATUS_BORDER: Record<TraceStep["status"], string> = {
  [TRACE_STATUS.RUNNING]: "border-amber-500/30",
  [TRACE_STATUS.DONE]: "border-emerald-500/20",
  [TRACE_STATUS.ERROR]: "border-destructive/30",
}

type Props = {
  step: TraceStep
  index: number
}

export function TraceStepCard({ step, index }: Props) {
  const icon = TOOL_ICONS[step.toolName] ?? <Search className="h-3.5 w-3.5" />

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className={cn("bg-card rounded-xl border px-3.5 py-3 text-xs", STATUS_BORDER[step.status])}
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <code className="text-foreground flex-1 font-mono font-medium">{step.toolName}</code>
        <div className="text-muted-foreground flex items-center gap-1.5">
          {step.durationMs !== undefined && (
            <span className="text-[10px] tabular-nums">{formatDuration(step.durationMs)}</span>
          )}
          <StatusIndicator status={step.status} />
        </div>
      </div>

      <div className="border-border mt-2.5 space-y-2 border-t pt-2.5">
        <JsonViewer label="Args" data={step.args} />
        {step.result !== undefined && <JsonViewer label="Result" data={step.result} defaultOpen />}
      </div>
    </motion.div>
  )
}
