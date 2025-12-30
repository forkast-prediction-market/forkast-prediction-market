import type { MergeableMarket } from '../_components/MergePositionsDialog'
import type { PublicPosition } from '../_components/PublicPositionItem'
import type { ConditionShares, PositionsTotals, ShareCardPayload, ShareCardVariant, SortOption } from '../_types/PublicPositionsTypes'
import { fetchUserOpenOrders } from '@/app/(platform)/event/[slug]/_hooks/useUserOpenOrdersQuery'
import { MICRO_UNIT, OUTCOME_INDEX } from '@/lib/constants'
import { formatCentsLabel, formatCurrency, formatPercent } from '@/lib/formatters'

export interface DataApiPosition {
  proxyWallet?: string
  asset?: string
  conditionId?: string
  size?: number
  avgPrice?: number
  initialValue?: number
  currentValue?: number
  curPrice?: number
  cashPnl?: number
  totalBought?: number
  realizedPnl?: number
  percentPnl?: number
  percentRealizedPnl?: number
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
}

export function formatCurrencyValue(value?: number) {
  return Number.isFinite(value) ? formatCurrency(value ?? 0) : '—'
}

export function getOutcomeLabel(position: PublicPosition) {
  if (position.outcome && position.outcome.trim()) {
    return position.outcome
  }
  return position.outcomeIndex === OUTCOME_INDEX.NO ? 'No' : 'Yes'
}

export function getOutcomeVariant(position: PublicPosition): ShareCardVariant {
  if (position.outcomeIndex === OUTCOME_INDEX.NO) {
    return 'no'
  }
  const label = getOutcomeLabel(position).toLowerCase()
  return label.includes('no') ? 'no' : 'yes'
}

export function buildShareCardPayload(position: PublicPosition): ShareCardPayload {
  const avgPrice = position.avgPrice ?? 0
  const shares = position.size ?? 0
  const tradeValue = shares * avgPrice
  const toWinValue = shares
  const nowPrice = Number.isFinite(position.curPrice) && position.curPrice !== undefined
    ? position.curPrice!
    : avgPrice
  const outcome = getOutcomeLabel(position)
  const imageUrl = position.icon ? `https://gateway.irys.xyz/${position.icon}` : undefined

  return {
    title: position.title || 'Untitled market',
    outcome,
    avgPrice: formatCentsLabel(avgPrice, { fallback: '—' }),
    odds: formatPercent(nowPrice * 100, { digits: 0 }),
    cost: formatCurrencyValue(tradeValue),
    invested: formatCurrencyValue(tradeValue),
    toWin: formatCurrencyValue(toWinValue),
    imageUrl,
    variant: getOutcomeVariant(position),
    eventSlug: position.eventSlug || position.slug,
  }
}

export function buildShareCardUrl(payload: ShareCardPayload) {
  const encodedPayload = encodeSharePayload(payload)
  const params = new URLSearchParams({
    position: encodedPayload,
  })
  return `/api/og?${params.toString()}`
}

function encodeSharePayload(payload: ShareCardPayload) {
  const json = JSON.stringify(payload)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function getTradeValue(position: PublicPosition) {
  return (position.size ?? 0) * (position.avgPrice ?? 0)
}

export function getValue(position: PublicPosition) {
  const currentValue = Number(position.currentValue)
  if (Number.isFinite(currentValue)) {
    return currentValue
  }

  const size = Number(position.size)
  if (!Number.isFinite(size) || size <= 0) {
    return 0
  }

  const avgPrice = Number(position.avgPrice)
  if (Number.isFinite(avgPrice)) {
    return size * avgPrice
  }

  const curPrice = Number(position.curPrice)
  if (Number.isFinite(curPrice)) {
    return size * curPrice
  }

  return 0
}

export function getLatestPrice(position: PublicPosition) {
  const curPrice = Number(position.curPrice)
  if (Number.isFinite(curPrice)) {
    return curPrice
  }

  const avgPrice = Number(position.avgPrice)
  if (Number.isFinite(avgPrice)) {
    return avgPrice
  }

  const size = Number(position.size)
  const currentValue = Number(position.currentValue)
  if (Number.isFinite(size) && size > 0 && Number.isFinite(currentValue)) {
    return currentValue / size
  }

  return 0
}

export function getPnlValue(position: PublicPosition) {
  return getValue(position) - getTradeValue(position)
}

export function getPnlPercent(position: PublicPosition) {
  const trade = getTradeValue(position)
  return trade > 0 ? (getPnlValue(position) / trade) * 100 : 0
}

export function parseNumber(value?: number | string | null) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : Number.NaN
  }
  return Number.NaN
}

export function resolvePositionsSortParams(sortBy: SortOption) {
  switch (sortBy) {
    case 'alpha':
      return { sortBy: 'TITLE', sortDirection: 'ASC' as const }
    case 'endingSoon':
      return { sortBy: 'RESOLVING', sortDirection: 'ASC' as const }
    case 'shares':
      return { sortBy: 'TOKENS', sortDirection: 'DESC' as const }
    case 'trade':
      return { sortBy: 'INITIAL', sortDirection: 'DESC' as const }
    case 'pnlPercent':
      return { sortBy: 'PERCENTPNL', sortDirection: 'DESC' as const }
    case 'pnlValue':
      return { sortBy: 'CASHPNL', sortDirection: 'DESC' as const }
    case 'latestPrice':
      return { sortBy: 'PRICE', sortDirection: 'DESC' as const }
    case 'avgCost':
      return { sortBy: 'AVGPRICE', sortDirection: 'DESC' as const }
    case 'payout':
      return { sortBy: 'TOKENS', sortDirection: 'DESC' as const }
    case 'currentValue':
    default:
      return { sortBy: 'CURRENT', sortDirection: 'DESC' as const }
  }
}

export function isClientOnlySort(sortBy: SortOption) {
  return sortBy === 'currentValue' || sortBy === 'latestPrice'
}

export function resolvePositionsSearchParams(searchQuery: string) {
  const trimmed = searchQuery.trim()
  if (!trimmed) {
    return {}
  }

  const parts = trimmed.split(',').map(part => part.trim()).filter(Boolean)
  const isConditionList = parts.length > 0
    && parts.every(part => /^0x[a-fA-F0-9]{64}$/.test(part))

  if (isConditionList) {
    return { market: parts.join(',') }
  }

  return { title: trimmed.slice(0, 100) }
}

export function matchesPositionsSearchQuery(position: PublicPosition, searchQuery: string) {
  const trimmed = searchQuery.trim().toLowerCase()
  if (!trimmed) {
    return true
  }

  const marketTitle = position.title?.toLowerCase() ?? ''
  const outcomeText = position.outcome?.toLowerCase() ?? ''
  const eventSlug = position.eventSlug?.toLowerCase() ?? ''
  const slug = position.slug?.toLowerCase() ?? ''
  const conditionId = position.conditionId?.toLowerCase() ?? ''

  return (
    marketTitle.includes(trimmed)
    || outcomeText.includes(trimmed)
    || eventSlug.includes(trimmed)
    || slug.includes(trimmed)
    || conditionId.includes(trimmed)
  )
}

export function mapDataApiPosition(position: DataApiPosition, status: 'active' | 'closed'): PublicPosition {
  const slug = position.slug || position.conditionId || 'unknown-market'
  const eventSlug = position.eventSlug || slug
  const timestampMs = typeof position.timestamp === 'number'
    ? position.timestamp * 1000
    : Date.now()
  const sizeValue = parseNumber(position.size)
  const avgPriceValue = parseNumber(position.avgPrice)
  const currentValueRaw = parseNumber(position.currentValue)
  const realizedValueRaw = parseNumber(position.realizedPnl)
  const curPriceRaw = parseNumber(position.curPrice)

  let derivedCurrentValue = Number.isFinite(currentValueRaw) ? currentValueRaw : Number.NaN
  if (!Number.isFinite(derivedCurrentValue)) {
    if (Number.isFinite(sizeValue) && sizeValue > 0) {
      if (Number.isFinite(curPriceRaw)) {
        derivedCurrentValue = sizeValue * curPriceRaw
      }
      else if (Number.isFinite(avgPriceValue)) {
        derivedCurrentValue = sizeValue * avgPriceValue
      }
    }
  }

  const currentValue = Number.isFinite(derivedCurrentValue) ? derivedCurrentValue : 0
  const realizedValue = Number.isFinite(realizedValueRaw) ? realizedValueRaw : currentValue
  const normalizedValue = status === 'closed' ? realizedValue : currentValue
  const derivedCurPrice = Number.isFinite(curPriceRaw)
    ? curPriceRaw
    : (Number.isFinite(sizeValue) && sizeValue > 0 && Number.isFinite(currentValue))
        ? currentValue / sizeValue
        : (Number.isFinite(avgPriceValue) ? avgPriceValue : Number.NaN)

  return {
    id: `${position.conditionId || slug}-${position.outcomeIndex ?? 0}-${status}`,
    title: position.title || 'Untitled market',
    slug,
    eventSlug,
    icon: position.icon,
    conditionId: position.conditionId,
    avgPrice: Number.isFinite(avgPriceValue) ? avgPriceValue : 0,
    currentValue: normalizedValue,
    curPrice: Number.isFinite(derivedCurPrice) ? derivedCurPrice : undefined,
    timestamp: timestampMs,
    status,
    outcome: position.outcome,
    outcomeIndex: position.outcomeIndex,
    oppositeOutcome: position.oppositeOutcome,
    mergeable: Boolean(position.mergeable),
    size: Number.isFinite(sizeValue) ? sizeValue : undefined,
  }
}

export function buildMergeableMarkets(positions: PublicPosition[]): MergeableMarket[] {
  const activeMergeable = positions.filter(
    position => position.status === 'active' && position.mergeable && position.conditionId,
  )

  const grouped = new Map<string, PublicPosition[]>()

  activeMergeable.forEach((position) => {
    const key = position.conditionId as string
    const existing = grouped.get(key) ?? []
    grouped.set(key, [...existing, position])
  })

  const markets: MergeableMarket[] = []

  grouped.forEach((groupPositions, conditionId) => {
    const outcomes = new Map<string, PublicPosition>()

    groupPositions.forEach((position) => {
      const outcomeKey = typeof position.outcomeIndex === 'number'
        ? position.outcomeIndex.toString()
        : position.outcome ?? 'unknown'

      const existing = outcomes.get(outcomeKey)
      if (!existing || (position.size ?? 0) > (existing.size ?? 0)) {
        outcomes.set(outcomeKey, position)
      }
    })

    if (outcomes.size < 2) {
      return
    }

    const outcomePositions = Array.from(outcomes.values())
    const mergeableAmount = Math.min(
      ...outcomePositions
        .map(position => position.size ?? 0)
        .filter(amount => amount > 0),
    )

    if (!Number.isFinite(mergeableAmount) || mergeableAmount <= 0) {
      return
    }

    const displayValue = Math.min(
      ...outcomePositions
        .map(position => position.currentValue ?? position.size ?? 0)
        .filter(amount => amount > 0),
    )

    const sample = outcomePositions[0]

    markets.push({
      conditionId,
      eventSlug: sample.eventSlug || sample.slug,
      title: sample.title,
      icon: sample.icon,
      mergeAmount: mergeableAmount,
      displayValue: Number.isFinite(displayValue) && displayValue > 0 ? displayValue : mergeableAmount,
    })
  })

  return markets
}

export function normalizeOrderShares(value: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0
  }
  return numeric > 100_000 ? numeric / MICRO_UNIT : numeric
}

export async function fetchLockedSharesByCondition(markets: MergeableMarket[]): Promise<Record<string, ConditionShares>> {
  const uniqueKeys = Array.from(new Map(
    markets
      .filter(market => market.conditionId && market.eventSlug)
      .map(market => [`${market.eventSlug}:${market.conditionId}`, { eventSlug: market.eventSlug!, conditionId: market.conditionId }]),
  ).values())

  const lockedByCondition: Record<string, ConditionShares> = {}

  await Promise.all(uniqueKeys.map(async ({ eventSlug, conditionId }) => {
    try {
      const openOrders = await fetchUserOpenOrders({
        pageParam: 0,
        eventSlug,
        conditionId,
      })

      openOrders.forEach((order) => {
        if (order.side !== 'sell') {
          return
        }

        const totalShares = Math.max(
          normalizeOrderShares(order.maker_amount),
          normalizeOrderShares(order.taker_amount),
        )
        const filledShares = normalizeOrderShares(order.size_matched)
        const remainingShares = Math.max(totalShares - Math.min(filledShares, totalShares), 0)
        if (remainingShares <= 0) {
          return
        }

        const outcomeIndex = order.outcome?.index === OUTCOME_INDEX.NO ? OUTCOME_INDEX.NO : OUTCOME_INDEX.YES
        const bucket = lockedByCondition[conditionId] ?? {
          [OUTCOME_INDEX.YES]: 0,
          [OUTCOME_INDEX.NO]: 0,
        }
        bucket[outcomeIndex] += remainingShares
        lockedByCondition[conditionId] = bucket
      })
    }
    catch (error) {
      console.error('Failed to fetch open orders for mergeable lock calculation.', error)
    }
  }))

  return lockedByCondition
}

export function sortPositions(positions: PublicPosition[], sortBy: SortOption) {
  const list = [...positions]

  list.sort((a, b) => {
    switch (sortBy) {
      case 'currentValue':
        return getValue(b) - getValue(a)
      case 'trade':
        return getTradeValue(b) - getTradeValue(a)
      case 'pnlPercent':
        return getPnlPercent(b) - getPnlPercent(a)
      case 'pnlValue':
        return getPnlValue(b) - getPnlValue(a)
      case 'shares':
        return (b.size ?? 0) - (a.size ?? 0)
      case 'alpha':
        return a.title.localeCompare(b.title)
      case 'endingSoon':
        return (a.timestamp ?? 0) - (b.timestamp ?? 0)
      case 'payout':
        return (b.size ?? 0) - (a.size ?? 0)
      case 'latestPrice':
        return getLatestPrice(b) - getLatestPrice(a)
      case 'avgCost':
        return (b.avgPrice ?? 0) - (a.avgPrice ?? 0)
      default:
        return 0
    }
  })

  return list
}

export function calculatePositionsTotals(positions: PublicPosition[]): PositionsTotals {
  const trade = positions.reduce((sum, position) => {
    const tradeValue = (position.size ?? 0) * (position.avgPrice ?? 0)
    return sum + tradeValue
  }, 0)
  const value = positions.reduce((sum, position) => sum + (position.currentValue ?? 0), 0)
  const toWin = positions.reduce((sum, position) => sum + (position.size ?? 0), 0)
  const diff = value - trade
  const pct = trade > 0 ? (diff / trade) * 100 : 0
  return { trade, value, diff, pct, toWin }
}
