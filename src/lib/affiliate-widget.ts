import type { Event, Outcome } from '@/types'
import { OUTCOME_INDEX } from '@/lib/constants'
import { EventRepository } from '@/lib/db/queries/event'

const DEFAULT_WIDGET_LIMIT = 5
const DEFAULT_WIDGET_CATEGORY = 'new'

export interface AffiliateWidgetEvent {
  id: string
  slug: string
  title: string
  mainTag: string
  imageUrl: string
  marketTitle: string
  marketSlug: string
  volume24h: number
  outcomes: {
    id: string
    label: string
    probability: number
    kind: 'yes' | 'no' | 'other'
  }[]
}

function normalizeProbability(value?: string | number | null): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Number(value.toFixed(2)) : 0
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Number(parsed.toFixed(2))
    }
  }

  return 0
}

function sanitizeCategory(category?: string | null): string {
  if (!category) {
    return DEFAULT_WIDGET_CATEGORY
  }

  const trimmed = category.trim()
  if (!trimmed) {
    return DEFAULT_WIDGET_CATEGORY
  }

  if (trimmed.toLowerCase() === 'all') {
    return DEFAULT_WIDGET_CATEGORY
  }

  return trimmed
}

function toWidgetEvent(event: Event): AffiliateWidgetEvent {
  const [primaryMarket] = event.markets
  const outcomes = primaryMarket?.outcomes ?? []
  const normalizedOutcomes = outcomes.slice(0, 3).map((outcome: Outcome) => {
    const kind = outcome.outcome_index === OUTCOME_INDEX.YES
      ? 'yes'
      : outcome.outcome_index === OUTCOME_INDEX.NO
        ? 'no'
        : 'other'

    return {
      id: outcome.id,
      label: outcome.outcome_text,
      probability: Math.max(0, Math.min(100, normalizeProbability(outcome.current_price))),
      kind,
    }
  })

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    mainTag: event.main_tag,
    imageUrl: primaryMarket?.icon_url || event.icon_url,
    marketTitle: primaryMarket?.title || event.title,
    marketSlug: primaryMarket?.slug || event.slug,
    volume24h: Number(primaryMarket?.current_volume_24h ?? 0),
    outcomes: normalizedOutcomes.length > 0
      ? normalizedOutcomes
      : [{
          id: event.id,
          label: 'Yes',
          probability: Math.max(0, Math.min(100, normalizeProbability(primaryMarket?.price ?? 0))),
          kind: 'yes' as const,
        }],
  }
}

export async function fetchAffiliateWidgetEvents(params: { category?: string | null, limit?: number } = {}) {
  const rawLimit = typeof params.limit === 'number' && Number.isFinite(params.limit)
    ? params.limit
    : DEFAULT_WIDGET_LIMIT
  const safeLimit = Math.min(Math.max(Math.floor(rawLimit), 1), DEFAULT_WIDGET_LIMIT)
  const category = sanitizeCategory(params.category)

  const { data, error } = await EventRepository.listEvents({
    tag: category,
    limit: safeLimit,
  })

  if (error || !data) {
    return []
  }

  return data.slice(0, safeLimit).map(toWidgetEvent)
}
