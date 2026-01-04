import type { Market } from '@/types'

const MAX_DISPLAY_SPREAD = 0.1

function clampPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return 0
  }
  if (value < 0) {
    return 0
  }
  if (value > 1) {
    return 1
  }
  return value
}

export function resolveDisplayPrice({
  bid,
  ask,
  lastTrade,
  maxSpread = MAX_DISPLAY_SPREAD,
}: {
  bid: number | null | undefined
  ask: number | null | undefined
  lastTrade: number | null | undefined
  maxSpread?: number
}) {
  const hasBid = typeof bid === 'number' && Number.isFinite(bid)
  const hasAsk = typeof ask === 'number' && Number.isFinite(ask)
  const hasLastTrade = typeof lastTrade === 'number' && Number.isFinite(lastTrade)

  if (hasBid && hasAsk) {
    const mid = ((ask as number) + (bid as number)) / 2
    const spread = Math.max(0, (ask as number) - (bid as number))
    if (spread <= maxSpread) {
      return clampPrice(mid)
    }
    return hasLastTrade ? clampPrice(lastTrade as number) : clampPrice(mid)
  }

  if (hasAsk) {
    return clampPrice(ask as number)
  }
  if (hasBid) {
    return clampPrice(bid as number)
  }

  return hasLastTrade ? clampPrice(lastTrade as number) : null
}

export function buildChanceByMarket(
  markets: Market[],
  priceOverrides: Record<string, number> = {},
) {
  function getPrice(market: Market) {
    const override = priceOverrides[market.condition_id]
    return clampPrice(override ?? market.price)
  }

  return markets.reduce<Record<string, number>>((acc, market) => {
    acc[market.condition_id] = getPrice(market) * 100
    return acc
  }, {})
}
