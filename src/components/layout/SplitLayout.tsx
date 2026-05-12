type SplitLayoutProps = {
  chat: React.ReactNode
  trace: React.ReactNode
}

export function SplitLayout({ chat, trace }: SplitLayoutProps) {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">{chat}</div>
      <div className="border-border flex w-[420px] shrink-0 flex-col border-l">{trace}</div>
    </div>
  )
}
