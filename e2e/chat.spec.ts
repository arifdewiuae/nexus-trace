import { test, expect, type Page } from "@playwright/test"

// Golden-path SSE frames, in the same wire format the real /api/chat emits
// (`data: <json>\n\n`). Mirrors the shapes in src/lib/streaming/types.ts. We mock the
// endpoint so the test exercises the full client stream → trace → replay flow without
// any real LLM/Tavily call.
const SSE_FRAMES: unknown[] = [
  { type: "moderation", durationMs: 8, blocked: false },
  { type: "model_start", modelCallId: "m1", label: "Reasoning" },
  { type: "tool_start", toolName: "web_search", toolCallId: "t1", args: { query: "capital of France" } },
  {
    type: "tool_result",
    toolName: "web_search",
    toolCallId: "t1",
    result: { answer: "Paris is the capital of France." },
    durationMs: 120,
  },
  { type: "step_end", stepIndex: 1 },
  { type: "model_start", modelCallId: "m2", label: "Responding" },
  { type: "token_delta", content: "The capital of France is " },
  { type: "token_delta", content: "Paris." },
  { type: "model_end", modelCallId: "m2", durationMs: 340 },
  {
    type: "done",
    totalSteps: 1,
    latencyMs: 512,
    ttftMs: 120,
    inputTokens: 1200,
    outputTokens: 42,
    estimatedCostUsd: 0.0004,
    // Included for wire-shape realism. The "View in LangSmith" link is gated on
    // NODE_ENV === "development"; this suite runs a production build, so the link is
    // intentionally not asserted here — it's a dev-only affordance.
    langsmithRunId: "run-abc123",
  },
]

const SSE_BODY = SSE_FRAMES.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("")

async function mockChat(page: Page) {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream" },
      body: SSE_BODY,
    })
  })
}

test("golden path: send → tool-call → stream → replay", async ({ page }) => {
  await mockChat(page)
  await page.goto("/")

  // The layout renders both a desktop and a mobile pane (one hidden via CSS), so every
  // node is duplicated in the DOM — scope each locator to the visible copy.
  const visibleText = (text: string | RegExp) =>
    page.getByText(text).filter({ visible: true }).first()

  // Send a message (demo mode enables the input; the network call is mocked).
  const input = page.getByPlaceholder("Ask anything...").filter({ visible: true })
  await expect(input).toBeEnabled()
  await input.fill("What is the capital of France?")
  await page.getByRole("button", { name: "Send message" }).filter({ visible: true }).click()

  // 1. Assistant tokens render (two deltas concatenated into one reply).
  await expect(visibleText("The capital of France is Paris.")).toBeVisible()

  // 2. Trace panel shows the tool call and a step count.
  await expect(visibleText("web_search")).toBeVisible()
  await expect(visibleText(/step/)).toBeVisible()

  // 3. DONE stats: total latency in the header, token/cost totals in SessionStats.
  await expect(visibleText(/total/)).toBeVisible()
  await expect(visibleText("tokens")).toBeVisible()

  // 4. Replay: reload restores the conversation + trace from sessionStorage.
  await page.reload()
  await expect(visibleText("The capital of France is Paris.")).toBeVisible()
  await expect(visibleText("web_search")).toBeVisible()
})

test("provider toggle: switch to Claude persists across reload", async ({ page }) => {
  await page.goto("/")

  const openSettings = () =>
    page.getByRole("button", { name: "API key settings" }).filter({ visible: true }).click()
  const claudeToggle = () =>
    page.getByRole("button", { name: /Claude/ }).filter({ visible: true })

  await openSettings()
  await claudeToggle().click()
  await page.getByRole("button", { name: "Save" }).filter({ visible: true }).click()

  // Reopen after a reload — the choice is persisted in localStorage.
  await page.reload()
  await openSettings()
  await expect(claudeToggle()).toHaveAttribute("aria-pressed", "true")
})
