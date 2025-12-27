import type { Market } from '@/types'

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
