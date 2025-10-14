export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenRouterChoice {
  message: {
    role: 'assistant'
    content: string
  }
}

interface OpenRouterResponse {
  choices: OpenRouterChoice[]
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const OPENROUTER_MODEL_DEFAULT = 'perplexity/llama-3.1-sonar-small-online'

export function isOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY)
}

export async function requestOpenRouterCompletion(messages: OpenRouterMessage[], options?: { temperature?: number, maxTokens?: number }) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OpenRouter API key is not configured.')
  }

  const model = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_DEFAULT

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_SITE_URL
  }

  if (process.env.NEXT_PUBLIC_SITE_NAME) {
    headers['X-Title'] = process.env.NEXT_PUBLIC_SITE_NAME
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 600,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`OpenRouter request failed: ${response.status} ${errorBody}`)
  }

  const completion = (await response.json()) as OpenRouterResponse
  const content = completion.choices[0]?.message?.content

  if (!content) {
    throw new Error('OpenRouter response did not contain any content.')
  }

  return content.trim()
}

export function sanitizeForPrompt(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ')?.trim() ?? 'Not provided'
}
