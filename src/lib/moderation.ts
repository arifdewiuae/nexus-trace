import { OPENAI_MODERATION_URL } from "./config"

// Patterns that indicate prompt injection / jailbreak attempts.
// Checked synchronously before any API call.
const JAILBREAK_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?previous\s+instructions/i,
  /forget\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+(?:a\s+)?DAN\b/i,
  /do\s+anything\s+now/i,
  /pretend\s+you\s+have\s+no\s+(?:restrictions|rules|guidelines|limits)/i,
  /you\s+have\s+no\s+(?:restrictions|rules|guidelines|safety)/i,
  /override\s+(?:your\s+)?(?:safety|system\s+prompt|restrictions)/i,
  /\bact\s+as\s+(?:if\s+you\s+(?:were|are)\s+)?an?\s+(?:unfiltered|unrestricted|uncensored)/i,
]

export interface ModerationResult {
  blocked: boolean
  reason: string
}

function checkJailbreakPatterns(text: string): ModerationResult {
  for (const pattern of JAILBREAK_PATTERNS) {
    if (pattern.test(text)) {
      return { blocked: true, reason: "Message contains disallowed content." }
    }
  }
  return { blocked: false, reason: "" }
}

async function checkOpenAIModeration(text: string, userKey?: string): Promise<ModerationResult> {
  const key = userKey ?? process.env.OPENAI_API_KEY
  if (!key) return { blocked: false, reason: "" }

  try {
    const res = await fetch(OPENAI_MODERATION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ input: text }),
    })

    if (!res.ok) return { blocked: false, reason: "" }

    const data = (await res.json()) as {
      results?: { flagged?: boolean }[]
    }

    if (data.results?.[0]?.flagged) {
      return { blocked: true, reason: "Message flagged for inappropriate content." }
    }
  } catch {
    // Fail open — don't block users if the moderation service is unavailable.
  }

  return { blocked: false, reason: "" }
}

export async function checkModeration(text: string, openaiKey?: string): Promise<ModerationResult> {
  const patternResult = checkJailbreakPatterns(text)
  if (patternResult.blocked) return patternResult
  return checkOpenAIModeration(text, openaiKey)
}
