import type { ClobOrderType, UserOpenOrder } from '@/types'
import { inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE, MICRO_UNIT } from '@/lib/constants'
import { UserRepository } from '@/lib/db/queries/user'
import { markets } from '@/lib/db/schema/events/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'
import { buildClobHmacSignature } from '@/lib/hmac'
import { getSupabaseImageUrl } from '@/lib/supabase'
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

export async function GET(request: Request) {
  try {
    const user = await UserRepository.getCurrentUser()
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
    const idFilter = searchParams.get('id')?.trim() || undefined
    const marketFilter = searchParams.get('market')?.trim() || undefined
    const assetIdFilter = searchParams.get('asset_id')?.trim() || undefined
    const validatedLimit = Number.isNaN(limit) ? 50 : Math.min(Math.max(1, limit), 100)
    const validatedOffset = Number.isNaN(offset) ? 0 : Math.max(0, offset)

    const clobOrders = await fetchClobOpenOrders({
      auth: tradingAuth.clob,
      userAddress: user.address,
      makerAddress: user.proxy_wallet_address as string,
      id: idFilter,
      market: marketFilter,
      assetId: assetIdFilter,
    })

    const conditionIds = Array.from(
      new Set(
        clobOrders
          .map(order => normalizeId(order.market))
          .filter(Boolean),
      ),
    )

    const { data: marketMetadata, error: marketError } = await fetchMarketMetadata(conditionIds)
    if (marketError) {
      console.error('Failed to fetch market metadata', marketError)
    }

    const { marketMap, outcomeMap } = buildMarketLookups(marketMetadata ?? [])

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

async function fetchClobOpenOrders({
  auth,
  userAddress,
  makerAddress,
  id,
  market,
  assetId,
}: {
  auth: { key: string, secret: string, passphrase: string }
  userAddress: string
  makerAddress?: string
  id?: string
  market?: string
  assetId?: string
}): Promise<ClobOpenOrder[]> {
  const params = new URLSearchParams()
  if (makerAddress) {
    params.set('maker', makerAddress)
  }
  if (id) {
    params.set('id', id)
  }
  if (market) {
    params.set('market', market)
  }
  if (assetId) {
    params.set('asset_id', assetId)
  }
  const path = params.toString() ? `/data/orders?${params.toString()}` : '/data/orders'
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = buildClobHmacSignature(auth.secret, timestamp, 'GET', path)

  const response = await fetch(`${CLOB_URL}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      FORKAST_ADDRESS: userAddress,
      FORKAST_API_KEY: auth.key,
      FORKAST_PASSPHRASE: auth.passphrase,
      FORKAST_TIMESTAMP: timestamp.toString(),
      FORKAST_SIGNATURE: signature,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
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

async function fetchMarketMetadata(conditionIds: string[]) {
  if (!conditionIds.length) {
    return { data: [], error: null }
  }

  return runQuery(async () => {
    const rows = await db.query.markets.findMany({
      where: inArray(markets.condition_id, conditionIds),
      columns: {
        condition_id: true,
        title: true,
        slug: true,
        icon_url: true,
        is_active: true,
        is_resolved: true,
      },
      with: {
        event: {
          columns: {
            slug: true,
            title: true,
            icon_url: true,
          },
        },
        condition: {
          columns: { id: true },
          with: {
            outcomes: {
              columns: {
                token_id: true,
                outcome_text: true,
                outcome_index: true,
              },
            },
          },
        },
      },
    })

    const data = rows.map(row => ({
      condition_id: row.condition_id,
      title: row.title,
      slug: row.slug,
      icon_url: getSupabaseImageUrl(row.icon_url || row.event?.icon_url || ''),
      event_slug: row.event?.slug || '',
      event_title: row.event?.title || '',
      is_active: Boolean(row.is_active),
      is_resolved: Boolean(row.is_resolved),
      outcomes: (row.condition?.outcomes || []).map(outcome => ({
        token_id: outcome.token_id,
        outcome_text: outcome.outcome_text || '',
        outcome_index: Number(outcome.outcome_index || 0),
      })),
    }))

    return { data, error: null }
  })
}

function buildMarketLookups(marketsList: Array<{
  condition_id: string
  title: string
  slug: string
  icon_url?: string
  event_slug?: string
  event_title?: string
  is_active: boolean
  is_resolved: boolean
  outcomes: Array<{
    token_id: string
    outcome_text: string
    outcome_index: number
  }>
}>) {
  const marketMap = new Map<string, UserOpenOrder['market'] & {
    icon_url?: string
    event_slug?: string
    event_title?: string
  }>()
  const outcomeMap = new Map<string, { index: number, text: string }>()

  for (const market of marketsList) {
    const normalizedCondition = normalizeId(market.condition_id)
    marketMap.set(normalizedCondition, {
      condition_id: market.condition_id,
      title: market.title,
      slug: market.slug,
      is_active: market.is_active,
      is_resolved: market.is_resolved,
      icon_url: market.icon_url || undefined,
      event_slug: market.event_slug || undefined,
      event_title: market.event_title || undefined,
    })

    for (const outcome of market.outcomes) {
      const normalizedToken = normalizeId(outcome.token_id)
      if (normalizedToken) {
        outcomeMap.set(normalizedToken, {
          index: outcome.outcome_index,
          text: outcome.outcome_text || '',
        })
      }
    }
  }

  return { marketMap, outcomeMap }
}

function mapClobOrder(
  order: ClobOpenOrder,
  marketMap: Map<string, UserOpenOrder['market'] & { icon_url?: string, event_slug?: string, event_title?: string }>,
  outcomeMap: Map<string, { index: number, text: string }>,
): (UserOpenOrder & { market: UserOpenOrder['market'] & { icon_url?: string, event_slug?: string, event_title?: string } }) | null {
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
