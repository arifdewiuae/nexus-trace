type SplitLayoutProps = {
  chat: React.ReactNode
  trace: React.ReactNode
}

export function SplitLayout({ chat, trace }: SplitLayoutProps) {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0">{chat}</div>
      <div className="flex flex-col w-[420px] shrink-0 border-l border-border">
        {trace}
      </div>
    </div>
  )
}
