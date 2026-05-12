import { tool } from "@langchain/core/tools"
import { tavily } from "@tavily/core"
import { z } from "zod"

function getTavilyClient() {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set")
  return tavily({ apiKey })
}

export const webSearch = tool(
  async ({ query }) => {
    const client = getTavilyClient()
    const response = await client.search(query, {
      maxResults: 5,
      searchDepth: "basic",
      includeAnswer: true,
    })

    const snippets = response.results
      .map((r) => `**${r.title}**\n${r.url}\n${r.content}`)
      .join("\n\n")

    return response.answer
      ? `${response.answer}\n\nSources:\n${snippets}`
      : snippets
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
