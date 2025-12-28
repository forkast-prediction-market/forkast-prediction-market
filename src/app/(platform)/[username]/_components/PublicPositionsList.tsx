'use client'

import type { SortOption } from '@/app/(platform)/[username]/_types/PublicPositionsTypes'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSignMessage } from 'wagmi'
import { useMergePositionsAction } from '@/app/(platform)/[username]/_hooks/useMergePositionsAction'
import { usePublicPositionsQuery } from '@/app/(platform)/[username]/_hooks/usePublicPositionsQuery'
import { usePublicPositionsShare } from '@/app/(platform)/[username]/_hooks/usePublicPositionsShare'
import { buildMergeableMarkets, calculatePositionsTotals, matchesPositionsSearchQuery, sortPositions } from '@/app/(platform)/[username]/_utils/PublicPositionsUtils'
import { useDebounce } from '@/hooks/useDebounce'
import { useIsMobile } from '@/hooks/useIsMobile'
import { OUTCOME_INDEX } from '@/lib/constants'
import { useTradingOnboarding } from '@/providers/TradingOnboardingProvider'
import { useUser } from '@/stores/useUser'
import { MergePositionsDialog } from './MergePositionsDialog'
import PublicPositionsFilters from './PublicPositionsFilters'
import PublicPositionsShareDialog from './PublicPositionsShareDialog'
import PublicPositionsTable from './PublicPositionsTable'

interface PublicPositionsListProps {
  userAddress: string
}

export default function PublicPositionsList({ userAddress }: PublicPositionsListProps) {
  const rowGridClass = 'grid grid-cols-[minmax(0,2.2fr)_repeat(4,minmax(0,1fr))_auto] items-center gap-4'
  const queryClient = useQueryClient()
  const { ensureTradingReady } = useTradingOnboarding()
  const user = useUser()
  const { signMessageAsync } = useSignMessage()
  const isMobile = useIsMobile()

  const marketStatusFilter: 'active' | 'closed' = 'active'
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [sortBy, setSortBy] = useState<SortOption>('currentValue')
  const minAmountFilter = 'All'
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const handleSearchChange = useCallback((query: string) => {
    setInfiniteScrollError(null)
    setIsLoadingMore(false)
    setRetryCount(0)
    setSearchQuery(query)
  }, [])

  const handleSortChange = useCallback((value: SortOption) => {
    setSortBy(value)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      setInfiniteScrollError(null)
      setIsLoadingMore(false)
      setSearchQuery('')
      setRetryCount(0)
    })
  }, [userAddress])

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = usePublicPositionsQuery({
    userAddress,
    status: marketStatusFilter,
    minAmountFilter,
    sortBy,
    searchQuery: debouncedSearchQuery,
  })

  const positions = useMemo(
    () => data?.pages.flat() ?? [],
    [data?.pages],
  )

  const visiblePositions = useMemo(
    () => positions.filter(position => matchesPositionsSearchQuery(position, debouncedSearchQuery)),
    [debouncedSearchQuery, positions],
  )

  const sortedPositions = useMemo(
    () => sortPositions(visiblePositions, sortBy),
    [sortBy, visiblePositions],
  )

  const loading = status === 'pending'
  const hasInitialError = status === 'error'

  const isSearchActive = debouncedSearchQuery.trim().length > 0
  const mergeableMarkets = useMemo(
    () => buildMergeableMarkets(positions),
    [positions],
  )
  const positionsByCondition = useMemo(() => {
    const map: Record<string, Record<typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO, number>> = {}

    positions
      .filter(position => position.status === 'active' && position.conditionId)
      .forEach((position) => {
        const conditionId = position.conditionId as string
        const outcomeIndex = position.outcomeIndex === OUTCOME_INDEX.NO ? OUTCOME_INDEX.NO : OUTCOME_INDEX.YES
        const size = typeof position.size === 'number' ? position.size : 0
        if (!map[conditionId]) {
          map[conditionId] = {
            [OUTCOME_INDEX.YES]: 0,
            [OUTCOME_INDEX.NO]: 0,
          }
        }
        map[conditionId][outcomeIndex] += size
      })

    return map
  }, [positions])
  const hasMergeableMarkets = mergeableMarkets.length > 0

  const { isMergeProcessing, handleMergeAll } = useMergePositionsAction({
    mergeableMarkets,
    positionsByCondition,
    hasMergeableMarkets,
    user,
    ensureTradingReady,
    queryClient,
    signMessageAsync,
    onSuccess: () => setIsMergeDialogOpen(false),
  })

  const {
    isShareDialogOpen,
    shareCardUrl,
    shareCardPayload,
    shareCardStatus,
    isCopyingShareImage,
    isSharingOnX,
    handleShareOpenChange,
    handleShareClick,
    handleShareCardLoaded,
    handleShareCardError,
    handleCopyShareImage,
    handleShareOnX,
  } = usePublicPositionsShare({
    userName: user?.username,
    userImage: user?.image,
  })

  useEffect(() => {
    setInfiniteScrollError(null)
    setIsLoadingMore(false)

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [debouncedSearchQuery, minAmountFilter, marketStatusFilter, sortBy])

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
            setRetryCount(0)
          })
          .catch((error) => {
            setIsLoadingMore(false)
            if (error.name !== 'AbortError') {
              setInfiniteScrollError(error.message || 'Failed to load more positions')
            }
          })
      }
    }, { rootMargin: '200px' })

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, infiniteScrollError, isFetchingNextPage, isLoadingMore])

  const retryInitialLoad = useCallback(() => {
    const currentRetryCount = retryCount + 1
    setRetryCount(currentRetryCount)
    setInfiniteScrollError(null)
    setIsLoadingMore(false)

    const delay = Math.min(1000 * 2 ** (currentRetryCount - 1), 8000)

    setTimeout(() => {
      void refetch()
    }, delay)
  }, [refetch, retryCount])

  const totals = useMemo(
    () => calculatePositionsTotals(visiblePositions),
    [visiblePositions],
  )

  return (
    <div className="space-y-3 pb-0">
      <PublicPositionsFilters
        searchQuery={searchQuery}
        sortBy={sortBy}
        onSearchChange={handleSearchChange}
        onSortChange={handleSortChange}
        showMergeButton={hasMergeableMarkets && marketStatusFilter === 'active'}
        onMergeClick={() => setIsMergeDialogOpen(true)}
      />

      <PublicPositionsTable
        rowGridClass={rowGridClass}
        positions={sortedPositions}
        totals={totals}
        isLoading={loading}
        hasInitialError={hasInitialError}
        isSearchActive={isSearchActive}
        searchQuery={debouncedSearchQuery}
        retryCount={retryCount}
        marketStatusFilter={marketStatusFilter}
        onRetry={retryInitialLoad}
        onRefreshPage={() => window.location.reload()}
        onShareClick={handleShareClick}
        loadMoreRef={loadMoreRef}
      />

      {(isFetchingNextPage || isLoadingMore) && (
        <div className="py-4 text-center text-xs text-muted-foreground">Loading more...</div>
      )}

      {infiniteScrollError && (
        <div className="py-4 text-center text-xs text-no">
          {infiniteScrollError}
          {' '}
          <button type="button" onClick={retryInitialLoad} className="underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

      <MergePositionsDialog
        open={isMergeDialogOpen}
        onOpenChange={setIsMergeDialogOpen}
        markets={mergeableMarkets}
        isProcessing={isMergeProcessing}
        onConfirm={handleMergeAll}
      />

      <PublicPositionsShareDialog
        isMobile={isMobile}
        isOpen={isShareDialogOpen}
        onOpenChange={handleShareOpenChange}
        shareCardUrl={shareCardUrl}
        shareCardPayload={shareCardPayload}
        shareCardStatus={shareCardStatus}
        isCopying={isCopyingShareImage}
        isSharing={isSharingOnX}
        onCardLoaded={handleShareCardLoaded}
        onCardError={handleShareCardError}
        onCopyImage={handleCopyShareImage}
        onShareOnX={handleShareOnX}
      />
    </div>
  )
}
