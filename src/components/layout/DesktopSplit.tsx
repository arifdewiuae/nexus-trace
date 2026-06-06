import { TRACE_PANEL_WIDTH_PX } from "@/lib/config"

type Props = {
  chat: React.ReactNode
  trace: React.ReactNode
}

// Desktop layout: chat fills remaining width, trace panel fixed on the right. Hidden on mobile.
export function DesktopSplit({ chat, trace }: Props) {
  return (
    <div className="hidden h-full overflow-hidden md:flex">
      <div className="flex min-w-0 flex-1 flex-col">{chat}</div>
      <div
        className="border-border flex shrink-0 flex-col border-l"
        style={{ width: TRACE_PANEL_WIDTH_PX }}
      >
        {trace}
      </div>
    </div>
  )
}
