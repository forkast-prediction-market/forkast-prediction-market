import type { RefObject } from 'react'
import type { Event, Market, Outcome } from '@/types'
import { create } from 'zustand'
import { mockUser } from '@/lib/mockData'

type Side = 'buy' | 'sell'
export type OrderType = 'market' | 'limit'
export type LimitExpirationOption = 'end-of-day' | 'custom'

interface OrderState {
  // Order state
  event: Event | null
  market: Market | null
  outcome: Outcome | null
  side: Side
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
  setSide: (side: Side) => void
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
  side: 'buy',
  type: 'market',
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
  setSide: (side: Side) => set({ side }),
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
  return useOrder(state => Math.round(state.market?.probability || 0))
}

export function useNoPrice() {
  const yesPrice = useYesPrice()
  return 100 - yesPrice
}

export function useIsBinaryMarket() {
  return useOrder(state => state.event?.total_markets_count === 1)
}

export function getAvgSellPrice() {
  const state = useOrder.getState()

  if (!state.market || !state.outcome) {
    return 0
  }

  const sellPrice
    = state.outcome.outcome_index === 0
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
    = state.outcome.outcome_index === 0
      ? (state.market.probability / 100) * 0.95
      : ((100 - state.market.probability) / 100) * 0.95

  return Number.parseFloat(state.amount || '0') * sellPrice
}

export function getUserShares() {
  const state = useOrder.getState()

  if (!state.market || !state.outcome) {
    return 0
  }

  const outcomeKey = `${state.market.condition_id}-${state.outcome.outcome_index === 0 ? 'yes' : 'no'}` as keyof typeof mockUser.shares
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
