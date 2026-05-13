# Nexus Trace

A streaming AI agent with a live tool-call trace panel. Ask a question, watch the reasoning steps and web searches unfold in real time — then read the answer as it arrives token by token.

Built as a portfolio project to demonstrate production-grade AI engineering: LangGraph ReAct loop, SSE streaming, rate limiting, session management, and a polished React UI.

---

## Features

- **Live trace panel** — every model reasoning step and tool call appears as it happens, with duration timers and inline query previews
- **Token-by-token streaming** — assistant responses stream via SSE; a cursor blinks as text arrives
- **Web search** — Tavily-powered search runs inside the agent loop; results feed back into the next reasoning step
- **Two-mode keys** — demo mode uses server-side keys; users can supply their own Fireworks + Tavily keys for higher rate limits
- **Rate limiting** — sliding-window limits per session (Upstash Redis in prod, in-memory fallback in dev)
- **Context management** — history is capped to the last 10 turns and long messages are truncated before hitting the LLM
- **Connection banner** — a fixed banner appears immediately when the network drops
- **Device-aware rendering** — tables on desktop, structured bullet lists on mobile
- **Sharp persona** — Nexus has a distinct voice: confident, direct, occasionally dry

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| AI orchestration | LangGraph.js (ReAct agent) |
| LLM | Fireworks.ai (`gpt-oss-20b` / `gpt-oss-120b`) |
| Web search | Tavily Search API |
| Streaming | Server-Sent Events (SSE) |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) |
| Animations | Framer Motion |
| Tests | Vitest + happy-dom |

---

## Architecture

```
ChatInput (user types)
  → useAgentStream.sendMessage()
    → POST /api/chat                    route handler
      → runAgentStream()                async generator (LangGraph)
        → createAgent() graph           ReAct loop
          → Fireworks.ai (LLM)
          → web_search tool → Tavily
        yields StreamEvent SSE strings
      → generatorToStream()             wrapped as ReadableStream
    → parseSSE()                        yields StreamEvent objects
    → applyEvent()                      updates React state
  → MessageList re-renders tokens live
  → TracePanel re-renders steps live
```

**Layers — strict, no cross-layer shortcuts:**

```
lib/agent/        AI layer     LangGraph graph, tools, system prompt
lib/api/          API layer    HTTP client (fetch wrappers)
lib/streaming/    Protocol     SSE encode/decode, StreamEvent types
lib/types.ts      Domain       Message, TraceStep, shared const objects
lib/config.ts     Config       All numeric + string constants
components/       UI layer     React components (1 file = 1 component)
hooks/            UI layer     React hooks
app/              Entry points Next.js routes and layouts
```

---

## Quickstart

```bash
git clone https://github.com/arifdewiuae/nexus-trace.git
cd nexus-trace
npm install
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
DEMO_KEYS_ENABLED=true
NEXT_PUBLIC_DEMO_KEYS_ENABLED=true
FIREWORKS_API_KEY=fw_...
TAVILY_API_KEY=tvly-...
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `FIREWORKS_API_KEY` | When demo mode on | LLM inference via Fireworks.ai |
| `TAVILY_API_KEY` | When demo mode on | Web search via Tavily |
| `DEMO_KEYS_ENABLED` | No | `true` to use server-side keys as fallback |
| `NEXT_PUBLIC_DEMO_KEYS_ENABLED` | No | Must match `DEMO_KEYS_ENABLED` |
| `FIREWORKS_MODEL` | No | Override model (default: `gpt-oss-20b`) |
| `UPSTASH_REDIS_REST_URL` | No | Redis URL for persistent rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Redis token for persistent rate limiting |

Without Upstash, rate limiting falls back to an in-memory store that resets on server restart — fine for dev, not for production.

---

## Commands

```bash
npm run dev          # start dev server on :3000
npm run build        # production build (also runs tsc)
npm run lint         # ESLint
npm run lint:fix     # ESLint with --fix
npm run format       # Prettier (sorts Tailwind classes)
npm test             # Vitest unit tests
npx tsc --noEmit     # type-check without emit
```

---

## Rate limits

| Key type | Limit |
|---|---|
| Demo (server keys) | 20 requests / hour |
| Own keys | 100 requests / hour |

Limits are per session (HTTP-only cookie, 1-year expiry). Upstash Redis is used in production; falls back to in-memory Map in development.
