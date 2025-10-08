import type { RefObject } from 'react'
import type { Event, Market, Outcome } from '@/types'
import { create } from 'zustand'
import { mockUser } from '@/lib/mockData'

type Side = 'buy' | 'sell'

interface OrderState {
  // Order state
  event: Event | null
  market: Market | null
  outcome: Outcome | null
  side: Side
  amount: string
  isLoading: boolean
  isMobileOrderPanelOpen: boolean
  inputRef: RefObject<HTMLInputElement | null>

  // Actions
  setEvent: (event: Event) => void
  setMarket: (market: Market) => void
  setOutcome: (outcome: Outcome) => void
  reset: () => void
  setSide: (side: Side) => void
  setAmount: (amount: string) => void
  setIsLoading: (loading: boolean) => void
  setIsMobileOrderPanelOpen: (loading: boolean) => void
}

export const useOrder = create<OrderState>()((set, _, store) => ({
  event: null,
  market: null,
  outcome: null,
  side: 'buy',
  amount: '0.00',
  isLoading: false,
  isMobileOrderPanelOpen: false,
  inputRef: { current: null as HTMLInputElement | null },

  setEvent: (event: Event) => set({ event }),
  setMarket: (market: Market) => set({ market }),
  setOutcome: (outcome: Outcome) => set({ outcome }),
  reset: () => set(store.getInitialState()),
  setSide: (side: Side) => set({ side }),
  setAmount: (amount: string) => set({ amount }),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  setIsMobileOrderPanelOpen: (open: boolean) => set({ isMobileOrderPanelOpen: open }),
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

  return Number.parseFloat(state.amount) * sellPrice
}

export function getUserShares() {
  const state = useOrder.getState()

  if (!state.market) {
    return 0
  }

  return mockUser.shares['1-yes'] || 0
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
  return useOrder(state => Number.parseFloat(state.amount))
}
