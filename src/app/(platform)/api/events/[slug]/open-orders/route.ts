import type { ClobOrderType, UserOpenOrder } from '@/types'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE, MICRO_UNIT } from '@/lib/constants'
import { EventRepository } from '@/lib/db/queries/event'
import { UserRepository } from '@/lib/db/queries/user'
import { buildClobHmacSignature } from '@/lib/hmac'
import { getUserTradingAuthSecrets } from '@/lib/trading-auth/server'

const CLOB_URL = process.env.CLOB_URL

interface ClobOpenOrder {
  id: string
  status: string
  market: string
  originalSize: string
  outcome?: string
  makerAddress: string
  owner?: string
  price?: string
  side: 'BUY' | 'SELL'
  sizeMatched?: string
  assetId?: string
  expiration?: string
  type?: ClobOrderType
  createdAt?: string
  updatedAt?: string
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await UserRepository.getCurrentUser()
    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        { error: 'Event slug is required.' },
        { status: 422 },
      )
    }

    if (!user) {
      return NextResponse.json({ data: [] })
    }

    if (!CLOB_URL) {
      console.error('Missing CLOB_URL environment variable.')
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    const tradingAuth = await getUserTradingAuthSecrets(user.id)
    if (!tradingAuth?.clob) {
      return NextResponse.json({ data: [] })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get('limit') || '50', 10)
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10)
    const conditionIdParam = searchParams.get('conditionId')
    const validatedLimit = Number.isNaN(limit) ? 50 : Math.min(Math.max(1, limit), 100)
    const validatedOffset = Number.isNaN(offset) ? 0 : Math.max(0, offset)
    const conditionId = conditionIdParam && conditionIdParam.trim().length > 0
      ? conditionIdParam.trim()
      : undefined

    const { data: marketMetadata, error: marketError } = await EventRepository.getEventMarketMetadata(slug)
    if (marketError || !marketMetadata || marketMetadata.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const targetMarkets = conditionId
      ? marketMetadata.filter(market => normalizeId(market.condition_id) === normalizeId(conditionId))
      : marketMetadata

    if (!targetMarkets.length) {
      return NextResponse.json({ data: [] })
    }

    const { marketMap, outcomeMap } = buildMarketLookups(targetMarkets)

    const clobOrders = await fetchClobOpenOrders({
      market: conditionId,
      userAddress: user.address,
      auth: tradingAuth.clob,
    })

    const normalizedOrders = clobOrders
      .map(order => mapClobOrder(order, marketMap, outcomeMap))
      .filter((order): order is UserOpenOrder => Boolean(order))

    const sortedOrders = normalizedOrders.sort((a, b) => {
      const aTime = Date.parse(a.created_at)
      const bTime = Date.parse(b.created_at)
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
    })

    const paginatedOrders = sortedOrders.slice(validatedOffset, validatedOffset + validatedLimit)

    return NextResponse.json({ data: paginatedOrders })
  }
  catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}

function buildMarketLookups(markets: Array<{
  condition_id: string
  title: string
  slug: string
  is_active: boolean
  is_resolved: boolean
  outcomes: Array<{
    token_id: string
    outcome_text: string
    outcome_index: number
  }>
}>) {
  const marketMap = new Map<string, UserOpenOrder['market']>()
  const outcomeMap = new Map<string, { index: number, text: string }>()

  markets.forEach((market) => {
    const normalizedConditionId = normalizeId(market.condition_id)
    if (normalizedConditionId) {
      marketMap.set(normalizedConditionId, {
        condition_id: market.condition_id,
        title: market.title,
        slug: market.slug,
        is_active: market.is_active,
        is_resolved: market.is_resolved,
      })
    }

    market.outcomes.forEach((outcome) => {
      const tokenKey = normalizeId(outcome.token_id)
      if (!tokenKey) {
        return
      }
      outcomeMap.set(tokenKey, {
        index: outcome.outcome_index,
        text: outcome.outcome_text || '',
      })
    })
  })

  return { marketMap, outcomeMap }
}

async function fetchClobOpenOrders({
  market,
  auth,
  userAddress,
}: {
  market?: string
  auth: { key: string, secret: string, passphrase: string }
  userAddress: string
}): Promise<ClobOpenOrder[]> {
  if (!CLOB_URL) {
    throw new Error('CLOB_URL is not configured.')
  }

  const searchParams = new URLSearchParams()
  if (market) {
    searchParams.set('market', market)
  }

  const path = '/data/orders'
  const query = searchParams.toString()
  const pathWithQuery = query ? `${path}?${query}` : path
  const url = `${CLOB_URL}${pathWithQuery}`
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = buildClobHmacSignature(auth.secret, timestamp, 'GET', pathWithQuery)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      KUEST_ADDRESS: userAddress,
      KUEST_API_KEY: auth.key,
      KUEST_PASSPHRASE: auth.passphrase,
      KUEST_TIMESTAMP: timestamp.toString(),
      KUEST_SIGNATURE: signature,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message = typeof payload?.error === 'string' ? payload.error : undefined
    throw new Error(message || `Failed to fetch open orders (status ${response.status})`)
  }

  const result = await response.json().catch(() => null)
  if (!Array.isArray(result)) {
    return []
  }

  return result as ClobOpenOrder[]
}

function mapClobOrder(
  order: ClobOpenOrder,
  marketMap: Map<string, UserOpenOrder['market']>,
  outcomeMap: Map<string, { index: number, text: string }>,
): UserOpenOrder | null {
  const marketMeta = marketMap.get(normalizeId(order.market))
  if (!marketMeta) {
    return null
  }

  const outcomeMeta = resolveOutcome(order, outcomeMap)
  const side = order.side === 'SELL' ? 'sell' : 'buy'
  const priceValue = clampNumber(parseNumber(order.price), 0, 1)
  const totalShares = Math.max(parseNumber(order.originalSize), 0)
  const filledShares = Math.max(parseNumber(order.sizeMatched), 0)
  const { makerAmount, takerAmount } = calculateAmounts(totalShares, priceValue, side)
  const expiry = parseNumber(order.expiration)

  return {
    id: order.id,
    side,
    type: order.type ?? 'GTC',
    status: order.status || 'live',
    price: priceValue,
    maker_amount: makerAmount,
    taker_amount: takerAmount,
    size_matched: Math.round(filledShares * MICRO_UNIT),
    created_at: order.createdAt || order.updatedAt || new Date().toISOString(),
    expiration: Number.isFinite(expiry) ? expiry : null,
    outcome: {
      index: outcomeMeta?.index ?? 0,
      text: outcomeMeta?.text || '',
    },
    market: marketMeta,
  }
}

function resolveOutcome(order: ClobOpenOrder, outcomeMap: Map<string, { index: number, text: string }>) {
  const candidates = [order.assetId, order.outcome]
  for (const candidate of candidates) {
    const normalized = normalizeId(candidate)
    if (!normalized) {
      continue
    }

    if (outcomeMap.has(normalized)) {
      return outcomeMap.get(normalized)
    }

    if (normalized.includes(':')) {
      const [base] = normalized.split(':')
      if (base && outcomeMap.has(base)) {
        return outcomeMap.get(base)
      }
    }
  }
  return undefined
}

function calculateAmounts(totalShares: number, price: number, side: 'buy' | 'sell') {
  const sharesMicro = Math.round(totalShares * MICRO_UNIT)
  const valueMicro = Math.round(totalShares * price * MICRO_UNIT)

  if (side === 'buy') {
    return {
      makerAmount: valueMicro,
      takerAmount: sharesMicro,
    }
  }

  return {
    makerAmount: sharesMicro,
    takerAmount: valueMicro,
  }
}

function normalizeId(value?: string | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function parseNumber(value?: string | number | null) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(Math.max(value, min), max)
}
