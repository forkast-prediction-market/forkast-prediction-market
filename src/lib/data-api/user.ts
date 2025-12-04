import type { ActivityOrder, PublicActivity, UserPosition } from '@/types'

interface DataApiRequestParams {
  pageParam: number
  userAddress: string
  signal?: AbortSignal
}

export interface DataApiActivity {
  proxyWallet?: string
  timestamp?: number
  conditionId?: string
  type?: string
  size?: number
  usdcSize?: number
  transactionHash?: string
  price?: number
  asset?: string
  side?: string
  outcomeIndex?: number
  title?: string
  slug?: string
  icon?: string
  eventSlug?: string
  outcome?: string
}

export interface DataApiPosition {
  proxyWallet?: string
  asset?: string
  conditionId?: string
  size?: number
  avgPrice?: number
  initialValue?: number
  currentValue?: number
  cashPnl?: number
  totalBought?: number
  realizedPnl?: number
  percentPnl?: number
  percentRealizedPnl?: number
  curPrice?: number
  redeemable?: boolean
  mergeable?: boolean
  title?: string
  slug?: string
  icon?: string
  eventSlug?: string
  outcome?: string
  outcomeIndex?: number
  oppositeOutcome?: string
  oppositeAsset?: string
  timestamp?: number
  orderCount?: number
}

const DATA_API_URL = process.env.DATA_URL!

function assertDataApiUrl() {
  if (!DATA_API_URL) {
    throw new Error('DATA_URL environment variable is not configured.')
  }
}

export function mapDataApiActivityToPublicActivity(activity: DataApiActivity): PublicActivity {
  const slug = activity.slug || activity.conditionId || 'unknown-market'
  const eventSlug = activity.eventSlug || slug
  const timestampMs = typeof activity.timestamp === 'number'
    ? activity.timestamp * 1000
    : Date.now()
  const usdcValue = Number.isFinite(activity.usdcSize) ? Number(activity.usdcSize) : 0
  const baseShares = Number.isFinite(activity.size) ? Number(activity.size) : undefined
  const shares = baseShares != null && activity.type?.toLowerCase() === 'split'
    ? baseShares * 2
    : baseShares

  return {
    id: activity.transactionHash || `${slug}-${timestampMs}`,
    title: activity.title || 'Untitled market',
    slug,
    eventSlug,
    icon: activity.icon,
    type: activity.type?.toLowerCase() || 'trade',
    outcomeText: activity.outcomeIndex != null
      ? (activity.outcomeIndex === 0 ? 'Yes' : 'No')
      : activity.outcome,
    price: Number.isFinite(activity.price) ? Number(activity.price) : undefined,
    shares,
    usdcValue,
    timestamp: timestampMs,
    txHash: activity.transactionHash,
  }
}

export function mapDataApiActivityToActivityOrder(activity: DataApiActivity): ActivityOrder {
  const slug = activity.slug || activity.conditionId || 'unknown-market'
  const eventSlug = activity.eventSlug || slug
  const timestampMs = typeof activity.timestamp === 'number'
    ? activity.timestamp * 1000
    : Date.now()
  const baseSize = Number.isFinite(activity.size) ? Number(activity.size) : 0
  const isSplit = activity.type?.toLowerCase() === 'split'
  const size = isSplit ? baseSize * 2 : baseSize
  const usdcValue = Number.isFinite(activity.usdcSize) ? Number(activity.usdcSize) : 0

  const price = isSplit
    ? 0.5
    : (Number.isFinite(activity.price) ? Number(activity.price) : 0)
  const outcomeText = isSplit
    ? 'Yes / No'
    : (activity.outcome || 'Outcome')
  const outcomeIndex = isSplit ? undefined : activity.outcomeIndex ?? 0

  return {
    id: activity.transactionHash || `${slug}-${timestampMs}`,
    type: activity.type?.toLowerCase(),
    user: {
      id: activity.proxyWallet || 'user',
      username: '',
      address: activity.proxyWallet || '',
      image: '',
    },
    side: activity.side?.toLowerCase() === 'sell' ? 'sell' : 'buy',
    amount: Math.round(size * 1e6).toString(),
    price: price.toString(),
    outcome: {
      index: outcomeIndex ?? 0,
      text: outcomeText,
    },
    market: {
      title: activity.title || 'Untitled market',
      slug,
      icon_url: activity.icon || '',
      event: {
        slug: eventSlug,
        show_market_icons: Boolean(activity.icon),
      },
    },
    total_value: Math.round(usdcValue * 1e6),
    created_at: new Date(timestampMs).toISOString(),
    status: 'completed',
  }
}

export async function fetchUserActivityData({
  pageParam,
  userAddress,
  signal,
  conditionId,
}: DataApiRequestParams & { conditionId?: string }): Promise<DataApiActivity[]> {
  assertDataApiUrl()

  const params = new URLSearchParams({
    limit: '50',
    offset: pageParam.toString(),
    user: userAddress,
  })

  if (conditionId) {
    params.set('marketId', conditionId)
    params.set('conditionId', conditionId)
  }

  const response = await fetch(`${DATA_API_URL}/activity?${params.toString()}`, { signal })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const errorMessage = errorBody?.error || 'Server error occurred. Please try again later.'
    throw new Error(errorMessage)
  }

  const result = await response.json()
  if (!Array.isArray(result)) {
    throw new TypeError('Unexpected response from data service.')
  }

  return result as DataApiActivity[]
}

export function mapDataApiPositionToUserPosition(
  position: DataApiPosition,
  status: 'active' | 'closed',
): UserPosition {
  const slug = position.slug || position.conditionId || 'unknown-market'
  const eventSlug = position.eventSlug || slug
  const timestampMs = typeof position.timestamp === 'number'
    ? position.timestamp * 1000
    : Date.now()

  const avgPrice = Number.isFinite(position.avgPrice) ? Number(position.avgPrice) : 0
  const currentValue = Number.isFinite(position.currentValue) ? Number(position.currentValue) : 0
  const realizedValue = Number.isFinite(position.realizedPnl)
    ? Number(position.realizedPnl)
    : currentValue
  const normalizedValue = status === 'closed' ? realizedValue : currentValue

  const orderCount = typeof position.orderCount === 'number'
    ? Math.max(0, Math.round(position.orderCount))
    : (typeof position.size === 'number' && position.size > 0 ? 1 : 0)
  const outcomeIndex = typeof position.outcomeIndex === 'number' ? position.outcomeIndex : undefined
  const outcomeText = position.outcome
    || (outcomeIndex != null ? (outcomeIndex === 0 ? 'Yes' : 'No') : undefined)

  return {
    market: {
      condition_id: position.conditionId || slug,
      title: position.title || 'Untitled market',
      slug,
      icon_url: position.icon || '',
      is_active: status === 'active',
      is_resolved: status === 'closed',
      event: {
        slug: eventSlug,
      },
    },
    outcome_index: outcomeIndex,
    outcome_text: outcomeText,
    average_position: Math.round(avgPrice * 1e6),
    total_position_value: Math.round(normalizedValue * 1e6),
    order_count: orderCount,
    last_activity_at: new Date(timestampMs).toISOString(),
  }
}

export async function fetchUserPositionsForMarket({
  pageParam,
  userAddress,
  status,
  conditionId,
  signal,
}: DataApiRequestParams & {
  status: 'active' | 'closed'
  conditionId?: string
}): Promise<UserPosition[]> {
  assertDataApiUrl()
  const endpoint = status === 'closed' ? '/closed-positions' : '/positions'
  const params = new URLSearchParams({
    user: userAddress,
    limit: '50',
    offset: pageParam.toString(),
    sortDirection: 'DESC',
  })

  if (status === 'closed') {
    params.set('sortBy', 'TIMESTAMP')
  }
  if (status === 'active') {
    params.set('sizeThreshold', '0')
  }
  if (conditionId) {
    params.set('marketId', conditionId)
    params.set('conditionId', conditionId)
  }

  const response = await fetch(`${DATA_API_URL}${endpoint}?${params.toString()}`, { signal })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const errorMessage = errorBody?.error || 'Server error occurred. Please try again later.'
    throw new Error(errorMessage)
  }

  const result = await response.json()
  if (!Array.isArray(result)) {
    throw new TypeError('Unexpected response from data service.')
  }

  return (result as DataApiPosition[]).map(item => mapDataApiPositionToUserPosition(item, status))
}
