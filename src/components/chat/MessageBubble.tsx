"use client"

import { memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { remarkNoTables } from "@/lib/remark-no-tables"
import type { ComponentPropsWithoutRef, AnchorHTMLAttributes } from "react"
import { type Message, MESSAGE_ROLE } from "@/lib/types"
import { cn, normaliseBr } from "@/lib/utils"
import { MOBILE_BREAKPOINT_PX } from "@/lib/config"
import { LoadingDots } from "@/components/ui/LoadingDots"
import { CodeBlock } from "./CodeBlock"

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

const baseComponents = { a: ExternalLink, pre: CodeBlock }
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

// Memoized so a streaming token (which replaces the messages array) only re-renders the
// active bubble — prior bubbles keep a stable `message` reference and skip re-rendering.
function MessageBubbleComponent({ message }: Props) {
  const isUser = message.role === MESSAGE_ROLE.USER

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
          <LoadingDots className="gap-1 py-0.5" dotClassName="bg-muted-foreground/50" />
        ) : (
          <div className={proseClasses}>
            <ReactMarkdown remarkPlugins={remarkPlugins} components={tableComponents as object}>
              {normaliseBr(message.content) + (message.isStreaming ? "​" : "")}
            </ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block h-[1em] w-[2px] animate-pulse bg-current align-middle opacity-70" />
            )}
            {message.truncated && !message.isStreaming && (
              <p className="text-muted-foreground mt-2 text-xs italic">
                Response was cut off — the output-token limit was reached.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export const MessageBubble = memo(MessageBubbleComponent)
