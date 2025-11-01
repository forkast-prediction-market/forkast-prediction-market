export const ORDER_SIDE = {
  BUY: 0,
  SELL: 1,
} as const

export const ORDER_TYPE = {
  MARKET: 0,
  LIMIT: 1,
} as const

export const OUTCOME_INDEX = {
  YES: 0,
  NO: 1,
}

export const CAP_MICRO = 990_000n
export const FLOOR_MICRO = 10_000n
