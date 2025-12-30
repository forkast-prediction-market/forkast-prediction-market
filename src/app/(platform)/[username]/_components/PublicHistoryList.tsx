'use client'

import type { HistorySort, HistoryTypeFilter } from '@/app/(platform)/[username]/_types/PublicHistoryTypes'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePublicHistoryQuery } from '@/app/(platform)/[username]/_hooks/usePublicHistoryQuery'
import { buildHistoryCsv, getActivityTimestampMs, matchesSearchQuery, matchesTypeFilter, toNumeric } from '@/app/(platform)/[username]/_utils/PublicHistoryUtils'
import PublicHistoryFilters from './PublicHistoryFilters'
import PublicHistoryTable from './PublicHistoryTable'

interface PublicHistoryListProps {
  userAddress: string
}

export default function PublicHistoryList({ userAddress }: PublicHistoryListProps) {
  const rowGridClass = 'grid grid-cols-[minmax(9rem,auto)_minmax(0,2.6fr)_minmax(0,1fr)_auto] items-center gap-3'
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>('all')
  const [sortFilter, setSortFilter] = useState<HistorySort>('newest')
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const {
    status,
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = usePublicHistoryQuery({ userAddress, typeFilter, sortFilter })

  const activities = useMemo(
    () => data?.pages.flat() ?? [],
    [data?.pages],
  )
  const visibleActivities = useMemo(() => {
    const filtered = activities
      .filter(activity => matchesSearchQuery(activity, searchQuery))
      .filter(activity => matchesTypeFilter(activity, typeFilter))

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      if (sortFilter === 'oldest') {
        return getActivityTimestampMs(a) - getActivityTimestampMs(b)
      }
      if (sortFilter === 'value') {
        return Math.abs(toNumeric(b.total_value)) - Math.abs(toNumeric(a.total_value))
      }
      if (sortFilter === 'shares') {
        return Math.abs(toNumeric(b.amount)) - Math.abs(toNumeric(a.amount))
      }
      return getActivityTimestampMs(b) - getActivityTimestampMs(a)
    })

    return sorted
  }, [activities, searchQuery, sortFilter, typeFilter])

  const isLoading = status === 'pending'
  const hasError = status === 'error'
  function handleExportCsv() {
    if (visibleActivities.length === 0) {
      return
    }

    const siteName = process.env.NEXT_PUBLIC_SITE_NAME!
    const { csvContent, filename } = buildHistoryCsv(visibleActivities, siteName)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!hasNextPage || !loadMoreRef.current) {
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (entry?.isIntersecting && !isFetchingNextPage && !isLoadingMore && !infiniteScrollError) {
        setIsLoadingMore(true)
        fetchNextPage()
          .then(() => {
            setIsLoadingMore(false)
            setInfiniteScrollError(null)
          })
          .catch((error) => {
            setIsLoadingMore(false)
            if (error.name !== 'AbortError') {
              setInfiniteScrollError(error.message || 'Failed to load more activity.')
            }
          })
      }
    }, { rootMargin: '200px' })

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, infiniteScrollError, isFetchingNextPage, isLoadingMore])

  useEffect(() => {
    setInfiniteScrollError(null)
    setIsLoadingMore(false)
  }, [searchQuery, sortFilter, typeFilter, userAddress])

  return (
    <div className="space-y-3 pb-0">
      <PublicHistoryFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        sortFilter={sortFilter}
        onSortChange={setSortFilter}
        onExport={handleExportCsv}
        disableExport={visibleActivities.length === 0}
      />

      <PublicHistoryTable
        activities={visibleActivities}
        rowGridClass={rowGridClass}
        isLoading={isLoading}
        hasError={hasError}
        onRetry={() => refetch()}
        isFetchingNextPage={isFetchingNextPage}
        isLoadingMore={isLoadingMore}
        infiniteScrollError={infiniteScrollError}
        onRetryLoadMore={() => {
          setInfiniteScrollError(null)
          void fetchNextPage()
        }}
        loadMoreRef={loadMoreRef}
      />
    </div>
  )
}
