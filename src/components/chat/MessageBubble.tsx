"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { remarkNoTables } from "@/lib/remark-no-tables"
import type { ComponentPropsWithoutRef, AnchorHTMLAttributes } from "react"
import type { Message } from "@/lib/types"
import { cn, normaliseBr } from "@/lib/utils"
import { MOBILE_BREAKPOINT_PX } from "@/lib/config"

// Evaluated once on the client at module load — mobile gets list view, desktop gets tables.
const USE_TABLES = typeof window !== "undefined" && window.innerWidth >= MOBILE_BREAKPOINT_PX

const remarkPlugins = USE_TABLES ? [remarkGfm] : [remarkGfm, remarkNoTables]

function ScrollableTable({ children }: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="overflow-x-auto rounded-lg">
      <table>{children}</table>
    </div>
  )
}

function ExternalLink({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>
}

const baseComponents = { a: ExternalLink }
const tableComponents = USE_TABLES
  ? { ...baseComponents, table: ScrollableTable }
  : baseComponents

const proseClasses = `prose prose-invert prose-sm max-w-none
  prose-p:my-1 prose-p:leading-relaxed
  prose-headings:mt-3 prose-headings:mb-1 prose-headings:font-semibold
  prose-ul:my-1 prose-ul:pl-4 prose-ol:my-1 prose-ol:pl-4
  prose-li:my-0.5
  prose-strong:font-semibold
  prose-blockquote:border-l-2 prose-blockquote:border-muted-foreground/40 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-muted-foreground
  prose-code:bg-background/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
  prose-pre:bg-background/60 prose-pre:rounded-lg
  prose-table:text-sm prose-th:font-semibold prose-td:py-1
  prose-hr:border-border`

type Props = { message: Message }

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-4 py-3 text-base leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {isUser ? (
          <span>
            {message.content}
            {message.isStreaming && (
              <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-current align-middle opacity-70" />
            )}
          </span>
        ) : message.isStreaming && !message.content ? (
          <div className="flex items-center gap-1 py-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="bg-muted-foreground/50 h-1.5 w-1.5 rounded-full"
                style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        ) : (
          <div className={proseClasses}>
            <ReactMarkdown remarkPlugins={remarkPlugins} components={tableComponents as object}>
              {normaliseBr(message.content) + (message.isStreaming ? "​" : "")}
            </ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block h-[1em] w-[2px] animate-pulse bg-current align-middle opacity-70" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
