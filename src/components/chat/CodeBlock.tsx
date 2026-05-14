"use client"

import { useRef, useState } from "react"
import { Check, Copy } from "lucide-react"
import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

export function CodeBlock({ children, className, ...props }: ComponentPropsWithoutRef<"pre">) {
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  const handleCopy = () => {
    const text = preRef.current?.innerText ?? ""
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="group relative">
      <pre ref={preRef} className={cn(className, "overflow-x-auto")} {...props}>
        {children}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy code"
        className={cn(
          "absolute right-2 top-2 rounded-md p-1.5 transition-all",
          "bg-muted/80 text-muted-foreground opacity-0 group-hover:opacity-100",
          "hover:bg-muted hover:text-foreground"
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}
