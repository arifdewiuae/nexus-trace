import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

export function formatCost(usd: number): string {
  if (usd < 0.00005) return "<$0.0001"
  if (usd < 0.001) return `$${usd.toFixed(4)}`
  if (usd < 0.1) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}

export function formatTokenCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export function normaliseBr(text: string): string {
  return text.replace(/<br\s*\/?>/gi, "\n")
}

export function resolveToolDecision(toolName: string, args: unknown): string {
  if (args && typeof args === "object") {
    const query = (args as Record<string, unknown>).query
    if (typeof query === "string" && query.trim()) return `→ ${toolName}: "${query}"`
  }
  return `→ ${toolName}`
}
