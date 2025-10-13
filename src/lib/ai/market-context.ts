import type { OpenRouterMessage } from '@/lib/ai/openrouter'
import type { Event, Market, Outcome } from '@/types'
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
  const price = typeof outcome.current_price === 'number'
    ? `${(outcome.current_price * 100).toFixed(1)}¢`
    : 'price unknown'

  const totalVolume = typeof outcome.total_volume === 'number'
    ? formatCurrency(outcome.total_volume, 2)
    : 'volume unknown'

  return `- ${outcome.outcome_text}: ${price}, lifetime volume ${totalVolume}`
}

function buildStructuredEventData(event: Event, market: Market) {
  const outcomes = market.outcomes?.map(formatOutcome).join('\n') || '- No outcome information provided.'

  const otherMarkets = event.markets
    .filter(candidate => candidate.condition_id !== market.condition_id)
    .slice(0, 3)
    .map((candidate) => {
      const probability = formatPercent(candidate.probability)
      const price = formatSharePrice(candidate.price)
      const vol = formatCurrency(candidate.total_volume, 2)
      return `- ${candidate.title} · implied probability ${probability} · price ${price} · total volume ${vol}`
    })
    .join('\n') || '- No other active markets recorded.'

  return [
    `Event title: ${sanitizeForPrompt(event.title)}`,
    `Event description: ${sanitizeForPrompt(event.description)}`,
    `Main tag: ${sanitizeForPrompt(event.main_tag)}`,
    `Additional tags: ${event.tags.length ? event.tags.join(', ') : 'none reported'}`,
    `Creator: ${sanitizeForPrompt(event.creator)}`,
    `Created at: ${sanitizeForPrompt(event.created_at)}`,
    `Updated at: ${sanitizeForPrompt(event.updated_at)}`,
    `Focused market title: ${sanitizeForPrompt(market.title)}`,
    `Market slug: ${sanitizeForPrompt(market.slug)}`,
    `Market oracle: ${sanitizeForPrompt(market.condition?.oracle)}`,
    `Implied probability: ${formatPercent(market.probability)}`,
    `Reference price per YES share: ${formatSharePrice(market.price)}`,
    `24h volume: ${formatCurrency(market.current_volume_24h, 2)}`,
    `Lifetime volume: ${formatCurrency(market.total_volume, 2)}`,
    `Outcome snapshot:\n${outcomes}`,
    `Other markets under the same event:\n${otherMarkets}`,
  ].join('\n')
}

export async function generateMarketContext(event: Event, market: Market) {
  const structuredData = buildStructuredEventData(event, market)

  const systemMessage = [
    'You are a research assistant specializing in prediction markets.',
    'Blend on-chain trading data with timely news research to craft insightful market briefings.',
    'When the provided data is sparse, explicitly acknowledge the gap while focusing on actionable intelligence.',
    'Use neutral, professional tone. Avoid marketing language.',
  ].join(' ')

  const instructions = [
    'Using the structured market data below, produce a narrative context similar to high-quality prediction market recaps.',
    'Combine up to three short paragraphs (each 2-4 sentences) that cover:',
    '1. Current market positioning and key probability/volume metrics.',
    '2. Recent catalysts, news, or narratives that could influence outcomes (leverage web browsing if your model supports it).',
    '3. Competitive dynamics, risk factors, or what to watch next for traders.',
    'Whenever citing probabilities or monetary figures, quote the numbers explicitly.',
    'If external research is performed, integrate it fluidly without citing URLs.',
    'Never return bullet points—write clean paragraphs.',
  ].join('\n')

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemMessage },
    {
      role: 'user',
      content: `${instructions}\n\nStructured data:\n${structuredData}`,
    },
  ]

  const raw = await requestOpenRouterCompletion(messages)
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
