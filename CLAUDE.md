# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

---

## Commands

```bash
npm run dev          # start dev server on :5173
npm run build        # production build (also runs tsc)
npm run lint         # ESLint (flat config, Next.js + TypeScript + Prettier rules)
npm run lint:fix     # ESLint with --fix
npm run format       # Prettier write (sorts Tailwind classes via prettier-plugin-tailwindcss)
npm run format:check # Prettier check (used in CI)
npx tsc --noEmit     # type-check without emitting
```

Tests are not yet set up (Task 9 — Vitest). When added, the command will be `npm test`.

## Environment Variables

Copy `.env.local.example` to `.env.local` before running locally.

| Variable | Required | Purpose |
|---|---|---|
| `FIREWORKS_API_KEY` | ✅ | LLM inference via Fireworks.ai |
| `TAVILY_API_KEY` | ✅ | Web search tool |
| `FIREWORKS_MODEL` | optional | Override default model (see `lib/config.ts`) |
| `FIREWORKS_BASE_URL` | optional | Override Fireworks endpoint |

## Architecture

### Layers — strict, no cross-layer shortcuts

```
lib/agent/        AI layer     LangGraph graph, tools, system prompt
lib/api/          API layer    HTTP client functions (fetch wrappers)
lib/streaming/    Protocol     SSE encode/decode, StreamEvent types
lib/types.ts      Domain       Message, TraceStep, shared const objects
lib/config.ts     Config       All numeric + string constants
components/       UI layer     React components (1 file = 1 component)
hooks/            UI layer     React hooks
app/              Entry points Next.js routes and layouts
```

The rule: UI layer imports from API layer. API layer never imports from UI. AI layer never imports from UI or API.

### Request Data Flow

```
ChatInput (user types)
  → useAgentStream.sendMessage()
    → lib/api/chat.ts streamChat()       [API layer — fetch]
      → POST /api/chat                   [route handler]
        → runAgentStream()               [AI layer — async generator]
          → createAgent() graph.streamEvents()
            → Fireworks.ai (LLM)
            → web_search tool → Tavily
          yields StreamEvent SSE strings
        → generatorToStream()            [wrapped as ReadableStream]
      response streams back
    → parseSSE()                         [streaming/utils]
      yields StreamEvent objects
    → applyEvent()                       [updates React state]
      → setMessages / setTraceSteps
  → MessageList re-renders tokens live
  → TracePanel re-renders steps live
```

### SSE Streaming Protocol

Every server→client message is `data: <JSON>\n\n`. The discriminated union `StreamEvent` in `lib/streaming/types.ts` defines all event shapes. Use `STREAM_EVENT` const (not string literals) everywhere:

```ts
STREAM_EVENT.TOKEN_DELTA   // streaming LLM token
STREAM_EVENT.TOOL_START    // tool invocation began
STREAM_EVENT.TOOL_RESULT   // tool completed
STREAM_EVENT.STEP_END      // ReAct step finished
STREAM_EVENT.DONE          // run complete, includes latencyMs
STREAM_EVENT.ERROR         // recoverable error
```

### "as const" Pattern

All string enumerations are `as const` objects — never raw string literals in logic:

- `STREAM_EVENT` — SSE event types (`lib/streaming/types.ts`)
- `TRACE_STATUS` — step status: RUNNING / DONE / ERROR (`lib/types.ts`)
- `GRAPH_EVENTS` — LangChain `streamEvents` names (`lib/config.ts`)

When adding new statuses or event types, add to the const object first, then use the const key.

### Server vs Client Components

`page.tsx` is a Server Component. The single `"use client"` boundary is `ChatContainer`. Everything below it is client-side. Components that have no state, effects, or browser APIs don't need `"use client"` — Next.js will correctly treat them as server-safe.

### Adding a New Agent Tool

1. Define the tool in `lib/agent/tools.ts` using `tool()` from `@langchain/core/tools` with a Zod schema.
2. Add it to `allTools`.
3. Add an icon entry to `TOOL_ICONS` in `components/trace/TraceStepCard.tsx`.
4. No changes needed to the graph, route, or hook — they are tool-agnostic.

### Key Constraints

- **No magic numbers or strings** — everything goes in `lib/config.ts` or the relevant `as const` object.
- **1 component per file** — no inline sub-components in the same file.
- **`formatDuration`** lives in `lib/utils.ts` (alongside `cn`) so it can be tested in isolation.
- **`generatorToStream` / `parseSSE`** live in `lib/streaming/utils.ts` for the same reason.
- The `langchain` package (not `@langchain/langgraph`) exports `createAgent` — the LangGraph prebuilt `createReactAgent` is deprecated.
