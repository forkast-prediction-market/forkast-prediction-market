const DEFAULT_TIMEOUT_MS = 5_000

function getBaseUrl(): string {
  const baseUrl = process.env.CLOB_URL ?? process.env.NEXT_PUBLIC_CLOB_URL

  if (!baseUrl) {
    throw new Error('CLOB_URL is not configured.')
  }

  return baseUrl.replace(/\/+$/, '')
}

function buildUrl(path: string, searchParams?: Record<string, string | number | undefined | null>) {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, getBaseUrl())

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null || value === '') {
        continue
      }
      url.searchParams.set(key, String(value))
    }
  }

  return url
}

async function fetchFromClob<T>(path: string, searchParams?: Record<string, string | number | undefined | null>): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const url = buildUrl(path, searchParams)
    const clobApiKey = process.env.CLOB_API_KEY ?? process.env.NEXT_PUBLIC_CLOB_API_KEY

    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(clobApiKey ? { 'X-API-Key': clobApiKey } : {}),
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`CLOB request failed [${response.status}]: ${body || response.statusText}`)
    }

    return await response.json() as T
  }
  finally {
    clearTimeout(timeout)
  }
}

export interface ClobRecentTrade {
  trade_id: string
  token_id: string
  price: number
  size: number
  side: 'buy' | 'sell'
  executed_at: string
  buyer_order_id?: string
  seller_order_id?: string
}

export interface ClobOutcomeSnapshot {
  token_id: string
  best_bid_price?: number | null
  best_bid_size?: number | null
  best_ask_price?: number | null
  best_ask_size?: number | null
  open_interest?: number | null
  rolling_24h_volume?: number | null
  rolling_total_volume?: number | null
  last_trade_price?: number | null
  last_trade_ts?: string | null
  recent_trades?: ClobRecentTrade[]
}

export interface ClobConditionSnapshot {
  condition_id: string
  status: string
  snapshot_ts?: string | null
  outcomes: ClobOutcomeSnapshot[]
}

interface ClobSnapshotResponse {
  generated_at: string
  conditions: ClobConditionSnapshot[]
}

export async function fetchConditionSnapshots(conditionIds: string[], recentTradesLimit = 3): Promise<ClobConditionSnapshot[]> {
  if (!conditionIds.length) {
    return []
  }

  const uniqueIds = Array.from(new Set(conditionIds.map(id => id.toLowerCase())))

  const response = await fetchFromClob<ClobSnapshotResponse>('/v1/conditions', {
    ids: uniqueIds.join(','),
    recent_trades_limit: recentTradesLimit,
  })

  return response.conditions ?? []
}
