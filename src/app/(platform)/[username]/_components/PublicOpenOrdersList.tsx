'use client'

import type { OpenOrdersSort } from '../_types/PublicOpenOrdersTypes'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { usePublicOpenOrdersQuery } from '../_hooks/usePublicOpenOrdersQuery'
import { matchesOpenOrdersSearchQuery, resolveOpenOrdersSearchParams, sortOpenOrders } from '../_utils/PublicOpenOrdersUtils'
import PublicOpenOrdersFilters from './PublicOpenOrdersFilters'
import PublicOpenOrdersTable from './PublicOpenOrdersTable'

interface PublicOpenOrdersListProps {
  userAddress: string
}

export default function PublicOpenOrdersList({ userAddress }: PublicOpenOrdersListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [sortBy, setSortBy] = useState<OpenOrdersSort>('market')
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const rowGridClass = 'grid grid-cols-[minmax(0,2.2fr)_repeat(6,minmax(0,1fr))_auto] items-center gap-4'
  const apiSearchFilters = useMemo(
    () => resolveOpenOrdersSearchParams(debouncedSearchQuery),
    [debouncedSearchQuery],
  )
  const apiSearchKey = useMemo(() => (
    `${apiSearchFilters.id ?? ''}|${apiSearchFilters.market ?? ''}|${apiSearchFilters.assetId ?? ''}`
  ), [apiSearchFilters])

  const {
    status,
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePublicOpenOrdersQuery({
    userAddress,
    apiSearchKey,
    apiSearchFilters,
  })

  const orders = useMemo(() => data?.pages.flat() ?? [], [data?.pages])
  const visibleOrders = useMemo(() => {
    const filtered = orders.filter(order => matchesOpenOrdersSearchQuery(order, searchQuery))
    return sortOpenOrders(filtered, sortBy)
  }, [orders, searchQuery, sortBy])

  useEffect(() => {
    if (!hasNextPage || !loadMoreRef.current) {
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (entry?.isIntersecting && !isFetchingNextPage) {
        void fetchNextPage()
      }
    }, { rootMargin: '200px' })

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const emptyText = userAddress
    ? (searchQuery.trim() ? 'No open orders match your search.' : 'No open orders found.')
    : 'Connect to view your open orders.'
  const loading = status === 'pending'

  return (
    <div className="space-y-3 pb-0">
      <PublicOpenOrdersFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <PublicOpenOrdersTable
        rowGridClass={rowGridClass}
        orders={visibleOrders}
        isLoading={loading}
        emptyText={emptyText}
        isFetchingNextPage={isFetchingNextPage}
        loadMoreRef={loadMoreRef}
      />
    </div>
  )
}
