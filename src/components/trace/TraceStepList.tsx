"use client"

import { AnimatePresence } from "framer-motion"
import type { TraceStep } from "@/lib/types"
import { STEP_TYPE } from "@/lib/types"
import { LoadingDots } from "@/components/ui/LoadingDots"
import { TraceStepCard } from "./TraceStepCard"

type Props = {
  steps: readonly TraceStep[]
  isStreaming: boolean
}

// The scrollable list of trace steps, with an empty/loading placeholder.
export function TraceStepList({ steps, isStreaming }: Props) {
  if (steps.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        {isStreaming ? (
          <LoadingDots />
        ) : (
          <p className="text-muted-foreground text-sm">Run a query to see the agent trace</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-2 overflow-y-auto p-3">
      <AnimatePresence initial={false}>
        {steps.map((step, i) => {
          const nextTool =
            step.stepType === STEP_TYPE.MODEL
              ? steps.slice(i + 1).find((s) => s.stepType === STEP_TYPE.TOOL)
              : undefined
          return <TraceStepCard key={step.id} step={step} index={i} nextTool={nextTool} />
        })}
      </AnimatePresence>
    </div>
  )
}
