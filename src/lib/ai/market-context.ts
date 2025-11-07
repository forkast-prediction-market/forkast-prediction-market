import type { MarketContextSettings } from '@/lib/ai/market-context-config'
import type { OpenRouterMessage } from '@/lib/ai/openrouter'
import type { Event, Market, Outcome } from '@/types'
import { loadMarketContextSettings } from '@/lib/ai/market-context-config'
import { requestOpenRouterCompletion, sanitizeForPrompt } from '@/lib/ai/openrouter'

function formatPercent(value: number | null | undefined, digits = 1) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'unknown'
  }

  const normalized = value > 1 ? value : value * 100

  return `${normalized.toFixed(digits)}%`
}

function formatCurrency(value: number | null | undefined, digits = 0) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'unknown'
  }

  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

function formatSharePrice(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'unknown'
  }

  const normalized = value > 1 ? value : value * 100

  return `${normalized.toFixed(1)}¢`
}

function formatOutcome(outcome: Outcome) {
  const buyPrice = formatSharePrice(outcome.buy_price)
  const sellPrice = formatSharePrice(outcome.sell_price)

  const totalVolume = typeof outcome.total_volume === 'number'
    ? formatCurrency(outcome.total_volume, 2)
    : 'volume unknown'

  return `- ${sanitizeForPrompt(outcome.outcome_text)}: buy ${buyPrice}, sell ${sellPrice}, lifetime volume ${totalVolume}`
}

function resolveEstimatedEndDate(market: Market) {
  const metadata = (market.metadata ?? {}) as Record<string, any>

  const rawCandidate = (
    metadata.estimated_end_date
    || metadata.estimatedEndDate
    || metadata.end_date
    || metadata.endDate
    || metadata.expiry
    || metadata.expiry_date
    || metadata.expires_at
    || metadata.resolution_date
    || metadata.close_date
    || metadata.closeDate
  )

  const candidates = [
    typeof rawCandidate === 'string' ? rawCandidate : undefined,
    typeof metadata.end_timestamp === 'string' ? metadata.end_timestamp : undefined,
    market.condition?.resolved_at,
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    const date = new Date(candidate)
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString()
    }
  }

  return 'Not provided'
}

function buildMarketContextVariables(event: Event, market: Market) {
  const outcomes = market.outcomes?.map(formatOutcome).join('\n') || '- No outcome information provided.'
  const estimatedEndDate = resolveEstimatedEndDate(market)

  return {
    'event-title': sanitizeForPrompt(event.title),
    'event-description': sanitizeForPrompt(event.description),
    'event-main-tag': sanitizeForPrompt(event.main_tag),
    'event-creator': sanitizeForPrompt(event.creator),
    'event-created-at': sanitizeForPrompt(event.created_at),
    'market-estimated-end-date': sanitizeForPrompt(estimatedEndDate),
    'market-title': sanitizeForPrompt(market.title),
    'market-probability': formatPercent(market.probability),
    'market-price': formatSharePrice(market.price),
    'market-volume-24h': formatCurrency(market.current_volume_24h, 2),
    'market-volume-total': formatCurrency(market.total_volume, 2),
    'market-outcomes': outcomes,
  }
}

function applyPromptTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/\[([a-z0-9-]+)\]/gi, (match, key) => {
    const normalized = key.toLowerCase()
    return Object.prototype.hasOwnProperty.call(variables, normalized)
      ? variables[normalized]
      : match
  })
}

export async function generateMarketContext(event: Event, market: Market, providedSettings?: MarketContextSettings) {
  const settings = providedSettings ?? await loadMarketContextSettings()
  const { prompt, model, apiKey } = settings

  if (!apiKey) {
    throw new Error('OpenRouter API key is not configured.')
  }

  const variables = buildMarketContextVariables(event, market)
  const userPrompt = applyPromptTemplate(prompt, variables)

  const systemMessage = [
    'You are a research assistant specializing in prediction markets.',
    'Blend on-chain trading data with timely news research to craft insightful market briefings.',
    'When the provided data is sparse, explicitly acknowledge the gap while focusing on actionable intelligence.',
    'Use neutral, professional tone. Avoid marketing language.',
  ].join(' ')

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemMessage },
    {
      role: 'user',
      content: userPrompt,
    },
  ]

  const raw = await requestOpenRouterCompletion(messages, {
    model,
    apiKey,
  })
  return normalizeModelOutput(raw)
}

export function normalizeModelOutput(content: string) {
  return content
    .replace(/<\|begin[^>]*\|>/g, '')
    .replace(/<\|end[^>]*\|>/g, '')
    .replace(/<｜begin[^>]*｜>/g, '')
    .replace(/<｜end[^>]*｜>/g, '')
    .trim()
}
