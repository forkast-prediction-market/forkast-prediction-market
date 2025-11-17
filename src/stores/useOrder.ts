'use client'

import type { RefObject } from 'react'
import type { OUTCOME_INDEX } from '@/lib/constants'
import type { Event, Market, OrderSide, OrderType, Outcome } from '@/types'
import { useMemo } from 'react'
import { create } from 'zustand'
import { useMarketYesPrices } from '@/app/(platform)/event/[slug]/_components/EventOutcomeChanceProvider'
import { ORDER_SIDE, ORDER_TYPE } from '@/lib/constants'

type ConditionShares = Record<typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO, number>

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

  userShares: Record<string, ConditionShares>

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
  setUserShares: (shares: Record<string, ConditionShares>) => void
}

export const useOrder = create<OrderState>()((set, _, store) => ({
  event: null,
  market: null,
  outcome: null,
  side: ORDER_SIDE.BUY,
  type: ORDER_TYPE.MARKET,
  amount: '',
  limitPrice: '0.0',
  limitShares: '0',
  limitExpirationEnabled: false,
  limitExpirationOption: 'end-of-day',
  isLoading: false,
  isMobileOrderPanelOpen: false,
  inputRef: { current: null as HTMLInputElement | null },
  lastMouseEvent: null,
  userShares: {},

  setEvent: (event: Event) => set({ event }),
  setMarket: (market: Market) => set({ market }),
  setOutcome: (outcome: Outcome) => set({ outcome }),
  reset: () => set(store.getInitialState()),
  setSide: (side: OrderSide) => set({ side }),
  setType: (type: OrderType) => set(state => ({
    type,
    amount: '',
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
  setUserShares: (shares: Record<string, ConditionShares>) => set({ userShares: shares }),
}))

function clampNormalizedPrice(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }
  if (value < 0) {
    return 0
  }
  if (value > 1) {
    return 1
  }
  return value
}

export function useYesPrice() {
  const yesPriceByMarket = useMarketYesPrices()
  const market = useOrder(state => state.market)

  return useMemo(() => {
    if (!market) {
      return null
    }

    const override = clampNormalizedPrice(yesPriceByMarket[market.condition_id])
    if (override !== null) {
      return override
    }

    return null
  }, [market, yesPriceByMarket])
}

export function useNoPrice() {
  const yesPriceByMarket = useMarketYesPrices()
  const market = useOrder(state => state.market)

  return useMemo(() => {
    if (!market) {
      return null
    }

    const override = clampNormalizedPrice(yesPriceByMarket[market.condition_id])
    if (override !== null) {
      return Math.max(0, Math.min(1, 1 - override))
    }

    return null
  }, [market, yesPriceByMarket])
}

export function useIsSingleMarket() {
  return useOrder(state => state.event?.total_markets_count === 1)
}

export function useIsLimitOrder() {
  return useOrder(state => state.type === ORDER_TYPE.LIMIT)
}

export function useAmountAsNumber() {
  return useOrder(state => Number.parseFloat(state.amount) || 0)
}
