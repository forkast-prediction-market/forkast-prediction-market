import { useCallback, useEffect, useState } from 'react'

export type MarketDetailTab = 'orderBook' | 'graph' | 'resolution' | 'history'

const DEFAULT_TAB: MarketDetailTab = 'orderBook'

export interface MarketDetailController {
  expandedMarketId: string | null
  orderBookPollingEnabled: boolean
  toggleMarket: (marketId: string) => void
  expandMarket: (marketId: string) => void
  collapseMarket: () => void
  selectDetailTab: (marketId: string, tab: MarketDetailTab) => void
  getSelectedDetailTab: (marketId: string) => MarketDetailTab
}

export function useMarketDetailController(eventId: string): MarketDetailController {
  const [expandedMarketId, setExpandedMarketId] = useState<string | null>(null)
  const [orderBookPollingEnabled, setOrderBookPollingEnabled] = useState(false)
  const [marketDetailTabById, setMarketDetailTabById] = useState<Record<string, MarketDetailTab>>({})

  useEffect(() => {
    setExpandedMarketId(null)
    setMarketDetailTabById({})
    setOrderBookPollingEnabled(false)
  }, [eventId])

  const ensureDefaultTab = useCallback((marketId: string) => {
    setMarketDetailTabById(prev => (prev[marketId]
      ? prev
      : { ...prev, [marketId]: DEFAULT_TAB }))
  }, [])

  const expandMarket = useCallback((marketId: string) => {
    ensureDefaultTab(marketId)
    setOrderBookPollingEnabled(true)
    setExpandedMarketId(marketId)
  }, [ensureDefaultTab])

  const collapseMarket = useCallback(() => {
    setExpandedMarketId(null)
    setOrderBookPollingEnabled(false)
  }, [])

  const toggleMarket = useCallback((marketId: string) => {
    setExpandedMarketId((current) => {
      if (current === marketId) {
        setOrderBookPollingEnabled(false)
        return null
      }

      ensureDefaultTab(marketId)
      setOrderBookPollingEnabled(true)
      return marketId
    })
  }, [ensureDefaultTab])

  const selectDetailTab = useCallback((marketId: string, tab: MarketDetailTab) => {
    setMarketDetailTabById(prev => ({ ...prev, [marketId]: tab }))
  }, [])

  const getSelectedDetailTab = useCallback(
    (marketId: string) => marketDetailTabById[marketId] ?? DEFAULT_TAB,
    [marketDetailTabById],
  )

  return {
    expandedMarketId,
    orderBookPollingEnabled,
    toggleMarket,
    expandMarket,
    collapseMarket,
    selectDetailTab,
    getSelectedDetailTab,
  }
}
