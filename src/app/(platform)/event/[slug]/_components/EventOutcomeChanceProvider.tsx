'use client'

import { createContext, use, useEffect, useMemo, useState } from 'react'

interface EventOutcomeChanceContextValue {
  chanceByMarket: Record<string, number>
  yesPriceByMarket: Record<string, number>
  chanceChangeByMarket: Record<string, number>
  setChanceByMarket: (next: Record<string, number>) => void
  setYesPriceByMarket: (next: Record<string, number>) => void
  setChanceChangeByMarket: (next: Record<string, number>) => void
}

const EventOutcomeChanceContext = createContext<EventOutcomeChanceContextValue | null>(null)

interface EventOutcomeChanceProviderProps {
  eventId: string
  children: React.ReactNode
}

export function EventOutcomeChanceProvider({ eventId, children }: EventOutcomeChanceProviderProps) {
  const [chanceByMarket, setChanceByMarket] = useState<Record<string, number>>({})
  const [yesPriceByMarket, setYesPriceByMarket] = useState<Record<string, number>>({})
  const [chanceChangeByMarket, setChanceChangeByMarket] = useState<Record<string, number>>({})

  useEffect(() => {
    setChanceByMarket({})
    setYesPriceByMarket({})
    setChanceChangeByMarket({})
  }, [eventId])

  const value = useMemo<EventOutcomeChanceContextValue>(() => ({
    chanceByMarket,
    yesPriceByMarket,
    chanceChangeByMarket,
    setChanceByMarket,
    setYesPriceByMarket,
    setChanceChangeByMarket,
  }), [chanceByMarket, yesPriceByMarket, chanceChangeByMarket])

  return (
    <EventOutcomeChanceContext value={value}>
      {children}
    </EventOutcomeChanceContext>
  )
}

export function useEventOutcomeChances() {
  const context = use(EventOutcomeChanceContext)
  if (!context) {
    throw new Error('useEventOutcomeChances must be used within an EventOutcomeChanceProvider')
  }
  return context.chanceByMarket
}

export function useUpdateEventOutcomeChances() {
  const context = use(EventOutcomeChanceContext)
  if (!context) {
    throw new Error('useUpdateEventOutcomeChances must be used within an EventOutcomeChanceProvider')
  }
  return context.setChanceByMarket
}

export function useMarketYesPrices() {
  const context = use(EventOutcomeChanceContext)
  if (!context) {
    throw new Error('useMarketYesPrices must be used within an EventOutcomeChanceProvider')
  }
  return context.yesPriceByMarket
}

export function useUpdateMarketYesPrices() {
  const context = use(EventOutcomeChanceContext)
  if (!context) {
    throw new Error('useUpdateMarketYesPrices must be used within an EventOutcomeChanceProvider')
  }
  return context.setYesPriceByMarket
}
export function useEventOutcomeChanceChanges() {
  const context = use(EventOutcomeChanceContext)
  if (!context) {
    throw new Error('useEventOutcomeChanceChanges must be used within an EventOutcomeChanceProvider')
  }
  return context.chanceChangeByMarket
}

export function useUpdateEventOutcomeChanceChanges() {
  const context = use(EventOutcomeChanceContext)
  if (!context) {
    throw new Error('useUpdateEventOutcomeChanceChanges must be used within an EventOutcomeChanceProvider')
  }
  return context.setChanceChangeByMarket
}
