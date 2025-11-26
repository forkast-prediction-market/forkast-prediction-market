import type { Market, Outcome, User } from '@/types'

export type OrderValidationError
  = | 'IS_LOADING'
    | 'NOT_CONNECTED'
    | 'MISSING_USER'
    | 'MISSING_MARKET'
    | 'MISSING_OUTCOME'
    | 'INVALID_AMOUNT'
    | 'INVALID_LIMIT_PRICE'
    | 'INVALID_LIMIT_SHARES'
    | 'LIMIT_SHARES_TOO_LOW'

export const MIN_LIMIT_ORDER_SHARES = 5

interface ValidateOrderArgs {
  isLoading: boolean
  isConnected: boolean
  user: User | null
  market: Market | null
  outcome: Outcome | null
  amountNumber: number
  isLimitOrder: boolean
  limitPrice: string
  limitShares: string
}

export type OrderValidationResult
  = | { ok: true }
    | { ok: false, reason: OrderValidationError }

export function validateOrder({
  isLoading,
  isConnected,
  user,
  market,
  outcome,
  amountNumber,
  isLimitOrder,
  limitPrice,
  limitShares,
}: ValidateOrderArgs): OrderValidationResult {
  if (isLoading) {
    return { ok: false, reason: 'IS_LOADING' }
  }

  if (!isConnected) {
    return { ok: false, reason: 'NOT_CONNECTED' }
  }

  if (!user) {
    return { ok: false, reason: 'MISSING_USER' }
  }

  if (!market) {
    return { ok: false, reason: 'MISSING_MARKET' }
  }

  if (!outcome) {
    return { ok: false, reason: 'MISSING_OUTCOME' }
  }

  if (isLimitOrder) {
    const limitPriceValue = Number.parseFloat(limitPrice)
    if (!Number.isFinite(limitPriceValue) || limitPriceValue <= 0) {
      return { ok: false, reason: 'INVALID_LIMIT_PRICE' }
    }

    const limitSharesValue = Number.parseFloat(limitShares)
    if (!Number.isFinite(limitSharesValue) || limitSharesValue <= 0) {
      return { ok: false, reason: 'INVALID_LIMIT_SHARES' }
    }

    if (limitSharesValue < MIN_LIMIT_ORDER_SHARES) {
      return { ok: false, reason: 'LIMIT_SHARES_TOO_LOW' }
    }

    return { ok: true }
  }

  if (amountNumber <= 0) {
    return { ok: false, reason: 'INVALID_AMOUNT' }
  }

  return { ok: true }
}
