import type { Event, Market, Outcome } from '@/types'
import { create } from 'zustand'

interface OrderState {
  // Order state
  event: Event | null
  market: Market | null
  outcome: Outcome | null
  activeTab: string
  amount: string
  isLoading: boolean
  isMobileOrderPanelOpen: boolean
  inputRef: HTMLInputElement | null

  // Actions
  setEvent: (event: Event) => void
  setMarket: (market: Market) => void
  setOutcome: (outcome: Outcome) => void
  reset: () => void
  setActiveTab: (tab: string) => void
  setAmount: (amount: string) => void
  setIsLoading: (loading: boolean) => void
  setIsMobileOrderPanelOpen: (loading: boolean) => void
  setInputRef: (ref: HTMLInputElement | null) => void
}

export const useOrder = create<OrderState>()((set, _, store) => ({
  event: null,
  market: null,
  outcome: null,
  activeTab: 'buy',
  amount: '0.00',
  isLoading: false,
  isMobileOrderPanelOpen: false,
  inputRef: null,

  setEvent: (event: Event) => set({ event }),
  setMarket: (market: Market) => set({ market }),
  setOutcome: (outcome: Outcome) => set({ outcome }),
  reset: () => set(store.getInitialState()),
  setActiveTab: (tab: string) => set({ activeTab: tab }),
  setAmount: (amount: string) => set({ amount }),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  setIsMobileOrderPanelOpen: (open: boolean) => set({ isMobileOrderPanelOpen: open }),
  setInputRef: (ref: HTMLInputElement | null) => set({ inputRef: ref }),
}))

export function useIsBinaryMarket() {
  return useOrder(state => state.event?.total_markets_count === 1)
}

export function useYesPrice() {
  return useOrder(state => Math.round(state.market?.probability || 0))
}

export function useNoPrice() {
  const yesPrice = useYesPrice()
  return 100 - yesPrice
}
