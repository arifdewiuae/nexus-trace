import { tool } from "@langchain/core/tools"
import { tavily } from "@tavily/core"
import { z } from "zod"
import {
  SEARCH_MAX_RESULTS,
  SEARCH_MAX_RETRIES,
  SEARCH_RETRY_DELAY_MS,
} from "@/lib/config"

function getTavilyClient() {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set")
  return tavily({ apiKey })
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = SEARCH_MAX_RETRIES
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, SEARCH_RETRY_DELAY_MS * attempt))
    }
  }
  throw new Error("Unreachable")
}

export const webSearch = tool(
  async ({ query }) => {
    try {
      const client = getTavilyClient()
      const response = await withRetry(() =>
        client.search(query, {
          maxResults: SEARCH_MAX_RESULTS,
          searchDepth: "basic",
          includeAnswer: true,
        })
      )

      if (!response.results?.length) {
        return `No results found for: "${query}". Try rephrasing the query.`
      }

      const snippets = response.results
        .map((r) => `**${r.title}**\n${r.url}\n${r.content}`)
        .join("\n\n")

      return response.answer
        ? `${response.answer}\n\nSources:\n${snippets}`
        : snippets
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return `Search failed after ${SEARCH_MAX_RETRIES} attempts: ${message}. Please try a different approach.`
    }
  },
  {
    name: "web_search",
    description:
      "Search the web for current information, recent news, facts, or any topic you don't have up-to-date knowledge about.",
    schema: z.object({
      query: z.string().describe("The search query to look up"),
    }),
  }
)

export const allTools = [webSearch]
