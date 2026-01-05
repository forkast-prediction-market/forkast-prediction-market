import { normalizeAddress } from '@/lib/wallet'

export interface ProfileLinkStats {
  positions: number
  profitLoss: number
  volume: number | null
}

const DATA_API_URL = process.env.DATA_URL ?? ''

const statsCache = new Map<string, Promise<ProfileLinkStats | null> | ProfileLinkStats | null>()

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function parseTradedCount(body: unknown): number {
  if (!body) {
    return 0
  }

  if (typeof body === 'object' && body !== null && 'traded' in body) {
    return toNumber((body as { traded?: unknown }).traded) ?? 0
  }

  return toNumber(body) ?? 0
}

function parseTradedVolume(body: unknown): number | null {
  if (!body) {
    return null
  }

  if (typeof body === 'object' && body !== null) {
    const candidate = body as {
      volume?: unknown
      total_volume?: unknown
      totalVolume?: unknown
      tradedVolume?: unknown
    }
    return toNumber(
      candidate.volume
      ?? candidate.total_volume
      ?? candidate.totalVolume
      ?? candidate.tradedVolume,
    )
  }

  return null
}

async function fetchJson(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { cache: 'no-store', signal })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return await response.json()
}

export async function fetchProfileLinkStats(
  userAddress?: string | null,
  signal?: AbortSignal,
): Promise<ProfileLinkStats | null> {
  if (!DATA_API_URL) {
    return null
  }

  const address = normalizeAddress(userAddress)
  if (!address) {
    return null
  }

  const cacheKey = address.toLowerCase()
  const cached = statsCache.get(cacheKey)
  if (cached) {
    return cached instanceof Promise ? await cached : cached
  }

  const request = (async () => {
    try {
      const activeParams = new URLSearchParams({
        user: address,
        limit: '100',
        offset: '0',
        sizeThreshold: '0',
        sortDirection: 'DESC',
      })
      const closedParams = new URLSearchParams({
        user: address,
        limit: '100',
        offset: '0',
        sortBy: 'TIMESTAMP',
        sortDirection: 'DESC',
      })
      const tradedUrl = `${DATA_API_URL}/traded?user=${encodeURIComponent(address)}`

      const [activePositionsResult, closedPositionsResult, tradedResult] = await Promise.allSettled([
        fetchJson(`${DATA_API_URL}/positions?${activeParams.toString()}`, signal),
        fetchJson(`${DATA_API_URL}/closed-positions?${closedParams.toString()}`, signal),
        fetchJson(tradedUrl, signal),
      ])

      const activePositions = activePositionsResult.status === 'fulfilled'
        && Array.isArray(activePositionsResult.value)
        ? activePositionsResult.value
        : []

      const closedPositions = closedPositionsResult.status === 'fulfilled'
        && Array.isArray(closedPositionsResult.value)
        ? closedPositionsResult.value
        : []

      const tradedCount = tradedResult.status === 'fulfilled'
        ? parseTradedCount(tradedResult.value)
        : 0

      const volume = tradedResult.status === 'fulfilled'
        ? parseTradedVolume(tradedResult.value)
        : null

      const positions = tradedCount || (activePositions.length + closedPositions.length)

      const profitLossActive = activePositions.reduce(
        (total, position) => total + (toNumber((position as any).cashPnl) ?? 0),
        0,
      )
      const profitLossClosed = closedPositions.reduce(
        (total, position) => total + (toNumber((position as any).realizedPnl) ?? 0),
        0,
      )

      return {
        positions,
        profitLoss: profitLossActive + profitLossClosed,
        volume,
      }
    }
    catch (error) {
      console.error('Failed to fetch profile link stats', error)
      return null
    }
  })()

  statsCache.set(cacheKey, request)
  const result = await request
  statsCache.set(cacheKey, result)
  return result
}
