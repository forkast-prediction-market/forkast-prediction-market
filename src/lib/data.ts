import type { EventWithMarkets, Tag } from './supabase'

// Simple cache to avoid unnecessary requests
const cache = new Map<string, { data: unknown, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return 'http://localhost:3000'
}

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T
  }
  return null
}

function setCachedData(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() })
}

export async function fetchTags(mainOnly = false): Promise<Tag[]> {
  const cacheKey = `tags-${mainOnly}`
  const cached = getCachedData<Tag[]>(cacheKey)
  if (cached)
    return cached

  try {
    const baseUrl = getBaseUrl()
    const url = mainOnly
      ? `${baseUrl}/api/tags?main=true`
      : `${baseUrl}/api/tags`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch tags: ${response.status}`)
    }

    const data = await response.json()
    setCachedData(cacheKey, data)
    return data
  }
  catch (error) {
    console.error('Error fetching tags:', error)
    return []
  }
}

export async function fetchEvents(
  category?: string,
  limit?: number,
): Promise<EventWithMarkets[]> {
  const cacheKey = `events-${category || 'all'}-${limit || 'all'}`
  const cached = getCachedData<EventWithMarkets[]>(cacheKey)
  if (cached)
    return cached

  try {
    const baseUrl = getBaseUrl()
    const params = new URLSearchParams()
    if (category)
      params.append('category', category)
    if (limit)
      params.append('limit', limit.toString())

    const url = `${baseUrl}/api/events${
      params.toString() ? `?${params.toString()}` : ''
    }`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.status}`)
    }

    const data = await response.json()
    setCachedData(cacheKey, data)
    return data
  }
  catch (error) {
    console.error('Error fetching events:', error)
    return []
  }
}

export interface RelatedEvent {
  id: number
  slug: string
  title: string
  description: string
  icon_url: string
  market: {
    name: string
    slug: string
    icon_url: string
  }
  common_tags_count: number
}

export async function fetchRelatedEvents(
  slug: string,
): Promise<RelatedEvent[]> {
  const cacheKey = `related-events-${slug}`
  const cached = getCachedData<RelatedEvent[]>(cacheKey)
  if (cached)
    return cached

  try {
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/api/events/${slug}/related`)

    if (!response.ok) {
      throw new Error(`Failed to fetch related events: ${response.status}`)
    }

    const data = await response.json()
    setCachedData(cacheKey, data)
    return data
  }
  catch (error) {
    console.error('Error fetching related events:', error)
    return []
  }
}

// NOVAS FUNÇÕES PARA DADOS DE TRADING

export async function fetchMarketTradingData(conditionId: string) {
  const cacheKey = `market-trading-${conditionId}`
  const cached = getCachedData(cacheKey)
  if (cached)
    return cached

  try {
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/api/markets/${conditionId}`)

    if (!response.ok) {
      throw new Error(
        `Failed to fetch market trading data: ${response.status}`,
      )
    }

    const data = await response.json()
    setCachedData(cacheKey, data)
    return data
  }
  catch (error) {
    console.error('Error fetching market trading data:', error)
    return null
  }
}

export async function fetchUserPositions(address: string, limit = 50) {
  const cacheKey = `user-positions-${address}-${limit}`
  const cached = getCachedData(cacheKey)
  if (cached)
    return cached

  try {
    const baseUrl = getBaseUrl()
    const response = await fetch(
      `${baseUrl}/api/users/${address}/positions?limit=${limit}`,
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch user positions: ${response.status}`)
    }

    const data = await response.json()
    setCachedData(cacheKey, data)
    return data
  }
  catch (error) {
    console.error('Error fetching user positions:', error)
    return { positions: [], summary: {} }
  }
}

export async function fetchTradingStats() {
  const cacheKey = 'trading-stats'
  const cached = getCachedData(cacheKey)
  if (cached)
    return cached

  try {
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/api/trading/stats`)

    if (!response.ok) {
      throw new Error(`Failed to fetch trading stats: ${response.status}`)
    }

    const data = await response.json()
    setCachedData(cacheKey, data)
    return data
  }
  catch (error) {
    console.error('Error fetching trading stats:', error)
    return {
      global_stats: {},
      top_markets: [],
      recent_fills: [],
    }
  }
}

// Function to manually clear cache if necessary
export function clearCache(): void {
  cache.clear()
}
