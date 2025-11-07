import type { RefObject } from 'react'
import type { Event, Market, OrderSide, OrderType, Outcome } from '@/types'
import { create } from 'zustand'
import { ORDER_SIDE, ORDER_TYPE, OUTCOME_INDEX } from '@/lib/constants'
import { mockUser } from '@/lib/mockData'

export type LimitExpirationOption = 'end-of-day' | 'custom'

interface OrderState {
  // Order state
  event: Event | null
  market: Market | null
  outcome: Outcome | null
  side: OrderSide
  type: OrderType
  amount: string
  limitPrice: string
  limitShares: string
  limitExpirationEnabled: boolean
  limitExpirationOption: LimitExpirationOption
  isLoading: boolean
  isMobileOrderPanelOpen: boolean
  inputRef: RefObject<HTMLInputElement | null>
  lastMouseEvent: any

  // Actions
  setEvent: (event: Event) => void
  setMarket: (market: Market) => void
  setOutcome: (outcome: Outcome) => void
  reset: () => void
  setSide: (side: OrderSide) => void
  setType: (type: OrderType) => void
  setAmount: (amount: string) => void
  setLimitPrice: (price: string) => void
  setLimitShares: (shares: string) => void
  setLimitExpirationEnabled: (enabled: boolean) => void
  setLimitExpirationOption: (option: LimitExpirationOption) => void
  setIsLoading: (loading: boolean) => void
  setIsMobileOrderPanelOpen: (loading: boolean) => void
  setLastMouseEvent: (lastMouseEvent: any) => void
}

export const useOrder = create<OrderState>()((set, _, store) => ({
  event: null,
  market: null,
  outcome: null,
  side: ORDER_SIDE.BUY,
  type: ORDER_TYPE.MARKET,
  amount: '0.00',
  limitPrice: '0.0',
  limitShares: '0',
  limitExpirationEnabled: false,
  limitExpirationOption: 'end-of-day',
  isLoading: false,
  isMobileOrderPanelOpen: false,
  inputRef: { current: null as HTMLInputElement | null },
  lastMouseEvent: null,

  setEvent: (event: Event) => set({ event }),
  setMarket: (market: Market) => set({ market }),
  setOutcome: (outcome: Outcome) => set({ outcome }),
  reset: () => set(store.getInitialState()),
  setSide: (side: OrderSide) => set({ side }),
  setType: (type: OrderType) => set(state => ({
    type,
    amount: '0.00',
    limitPrice: '0.0',
    limitShares: '0',
    limitExpirationEnabled: false,
    limitExpirationOption: 'end-of-day',
    side: state.side,
  })),
  setAmount: (amount: string) => set({ amount }),
  setLimitPrice: (price: string) => set({ limitPrice: price }),
  setLimitShares: (shares: string) => set({ limitShares: shares }),
  setLimitExpirationEnabled: (enabled: boolean) => set({ limitExpirationEnabled: enabled }),
  setLimitExpirationOption: (option: LimitExpirationOption) => set({ limitExpirationOption: option }),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  setIsMobileOrderPanelOpen: (open: boolean) => set({ isMobileOrderPanelOpen: open }),
  setLastMouseEvent: (lastMouseEvent: any) => set({ lastMouseEvent }),
}))

export function useYesPrice() {
  return useOrder((state) => {
    const yesOutcome = state.market?.outcomes?.[OUTCOME_INDEX.YES]
    if (!yesOutcome) {
      return undefined
    }

    const rawPrice = state.side === ORDER_SIDE.BUY
      ? yesOutcome.buy_price
      : yesOutcome.sell_price

    return formatPriceToCents(rawPrice)
  }) ?? formatPriceToCents()
}

export function useNoPrice() {
  return useOrder((state) => {
    const noOutcome = state.market?.outcomes?.[OUTCOME_INDEX.NO]
    if (!noOutcome) {
      return undefined
    }

    const rawPrice = state.side === ORDER_SIDE.BUY
      ? noOutcome.buy_price
      : noOutcome.sell_price

    return formatPriceToCents(rawPrice)
  }) ?? formatPriceToCents()
}

export function useIsBinaryMarket() {
  return useOrder(state => state.event?.total_markets_count === 1)
}

export function useIsLimitOrder() {
  return useOrder(state => state.type === ORDER_TYPE.LIMIT)
}

export function getAvgSellPrice() {
  const state = useOrder.getState()

  if (!state.market || !state.outcome) {
    return 0
  }

  const sellPrice
    = state.outcome.outcome_index === OUTCOME_INDEX.YES
      ? Math.round(state.market.probability * 0.95)
      : Math.round((100 - state.market.probability) * 0.95)

  return sellPrice.toString()
}

export function calculateSellAmount() {
  const state = useOrder.getState()

  if (!state.market || !state.outcome) {
    return 0
  }

  const sellPrice
    = state.outcome.outcome_index === OUTCOME_INDEX.YES
      ? (state.market.probability / 100) * 0.95
      : ((100 - state.market.probability) / 100) * 0.95

  return Number.parseFloat(state.amount || '0') * sellPrice
}

export function getUserShares() {
  const state = useOrder.getState()

  if (!state.market || !state.outcome) {
    return 0
  }

  const outcomeKey = `${state.market.condition_id}-${state.outcome.outcome_index === OUTCOME_INDEX.YES ? 'yes' : 'no'}` as keyof typeof mockUser.shares
  const shares = mockUser.shares[outcomeKey]

  return shares ?? 0
}

export function getYesShares(outcomeId: string) {
  if (outcomeId.includes('-yes')) {
    const shareKey = outcomeId as keyof typeof mockUser.shares
    return mockUser.shares[shareKey] || 0
  }

  if (outcomeId.includes('-no')) {
    const baseId = outcomeId.replace('-no', '-yes')
    const shareKey = baseId as keyof typeof mockUser.shares
    return mockUser.shares[shareKey] || 0
  }

  const shareKey = `${outcomeId}-yes` as keyof typeof mockUser.shares
  return mockUser.shares[shareKey] || 0
}

export function getNoShares(outcomeId: string) {
  if (outcomeId.includes('-no')) {
    const shareKey = outcomeId as keyof typeof mockUser.shares
    return mockUser.shares[shareKey] || 0
  }

  if (outcomeId.includes('-yes')) {
    const baseId = outcomeId.replace('-yes', '-no')
    const shareKey = baseId as keyof typeof mockUser.shares
    return mockUser.shares[shareKey] || 0
  }

  const shareKey = `${outcomeId}-no` as keyof typeof mockUser.shares
  return mockUser.shares[shareKey] || 0
}

export function useAmountAsNumber() {
  return useOrder(state => Number.parseFloat(state.amount) || 0)
}

export function useOrderSide() {
  return useOrder(state => state.side)
}

export function useOrderAmount() {
  return useOrder(state => state.amount)
}

export function useOrderInputRef() {
  return useOrder(state => state.inputRef)
}

function formatPriceToCents(price?: number) {
  const normalized = typeof price === 'number' && Number.isFinite(price)
    ? Math.min(Math.max(price, 0), 1)
    : 0.5

  return Number((normalized * 100).toFixed(2))
}
