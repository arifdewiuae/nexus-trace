import { DesktopSplit } from "./DesktopSplit"
import { MobileTabs } from "./MobileTabs"

type Props = {
  chat: React.ReactNode
  trace: React.ReactNode
  isStreaming?: boolean
  hasTrace?: boolean
}

// Picks the layout per breakpoint: side-by-side on desktop, tabbed panes on mobile.
export function SplitLayout({ chat, trace, isStreaming, hasTrace }: Props) {
  return (
    <>
      <DesktopSplit chat={chat} trace={trace} />
      <MobileTabs chat={chat} trace={trace} isStreaming={isStreaming} hasTrace={hasTrace} />
    </>
  )
}
