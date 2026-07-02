import { defineConfig, devices } from "@playwright/test"

const PORT = 3000
const BASE_URL = `http://localhost:${PORT}`

// E2E runs against a production build. The chat UI is gated on having keys, so we enable
// demo mode for the build (NEXT_PUBLIC_* is inlined at build time) — the /api/chat call
// itself is intercepted and mocked in the spec, so no real keys or LLM calls happen.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start",
    url: BASE_URL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: { NEXT_PUBLIC_DEMO_KEYS_ENABLED: "true" },
  },
})
