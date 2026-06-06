"use client"

import { X } from "lucide-react"

type Props = {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

// Reusable dialog shell: backdrop, centered card, Escape-to-close, titled header, optional footer.
export function Modal({ title, onClose, children, footer }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="bg-card border-border relative w-full max-w-md rounded-2xl border shadow-2xl">
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-muted-foreground hover:text-foreground cursor-pointer rounded-lg p-1.5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">{children}</div>

        {footer && (
          <div className="border-border flex items-center justify-between border-t px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
