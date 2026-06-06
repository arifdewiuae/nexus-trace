import { cn } from "@/lib/utils"

type Props = {
  className?: string
  dotClassName?: string
}

// Three staggered pulsing dots — the streaming/loading placeholder used across the app.
export function LoadingDots({ className, dotClassName }: Props) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("bg-muted-foreground/40 h-1.5 w-1.5 rounded-full", dotClassName)}
          style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  )
}
