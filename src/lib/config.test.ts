import { describe, it, expect, afterEach, vi } from "vitest"
import { PROVIDER, resolveProvider, langsmithRunUrl, LANGSMITH_APP_URL } from "./config"

describe("resolveProvider", () => {
  it("returns anthropic only for the exact 'anthropic' value", () => {
    expect(resolveProvider("anthropic")).toBe(PROVIDER.ANTHROPIC)
  })

  it("falls back to fireworks for anything else", () => {
    expect(resolveProvider("fireworks")).toBe(PROVIDER.FIREWORKS)
    expect(resolveProvider(undefined)).toBe(PROVIDER.FIREWORKS)
    expect(resolveProvider("")).toBe(PROVIDER.FIREWORKS)
    expect(resolveProvider("Anthropic")).toBe(PROVIDER.FIREWORKS) // case-sensitive
  })
})

describe("langsmithRunUrl", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("builds a per-run deep link off the configured project URL", () => {
    vi.stubEnv("NEXT_PUBLIC_LANGSMITH_PROJECT_URL", "https://smith.langchain.com/o/x/projects/p/y")
    expect(langsmithRunUrl("run-123")).toBe("https://smith.langchain.com/o/x/projects/p/y/r/run-123")
  })

  it("trims a trailing slash on the project URL before appending", () => {
    vi.stubEnv("NEXT_PUBLIC_LANGSMITH_PROJECT_URL", "https://smith.langchain.com/o/x/projects/p/y/")
    expect(langsmithRunUrl("run-123")).toBe("https://smith.langchain.com/o/x/projects/p/y/r/run-123")
  })

  it("falls back to the LangSmith app URL when no project URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_LANGSMITH_PROJECT_URL", "")
    expect(langsmithRunUrl("run-123")).toBe(LANGSMITH_APP_URL)
  })
})
