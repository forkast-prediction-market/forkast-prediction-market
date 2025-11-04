'use client'

import type { UserPosition } from '@/types'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { SearchIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebounce } from '@/hooks/useDebounce'
import PositionItem from './PositionItem'
import PositionsInfiniteScrollSkeleton from './PositionsInfiniteScrollSkeleton'
import PositionsLoadingState from './PositionsLoadingState'
import PublicPositionsEmpty from './PublicPositionsEmpty'
import PublicPositionsError from './PublicPositionsError'
import PublicPositionsInfiniteScrollError from './PublicPositionsInfiniteScrollError'

interface PositionsFilterControlsProps {
  marketStatusFilter: 'active' | 'closed'
  searchQuery: string
  minAmountFilter: string
  handleStatusFilterChange: (status: 'active' | 'closed') => void
  handleSearchChange: (query: string) => void
  handleAmountFilterChange: (amount: string) => void
}

function PositionsFilterControls({
  marketStatusFilter,
  searchQuery,
  minAmountFilter,
  handleStatusFilterChange,
  handleSearchChange,
  handleAmountFilterChange,
}: PositionsFilterControlsProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <ButtonGroup>
          <Button
            variant={marketStatusFilter === 'active' ? 'secondary' : 'outline'}
            onClick={() => handleStatusFilterChange('active')}
          >
            Active
          </Button>
          <Button
            variant={marketStatusFilter === 'closed' ? 'secondary' : 'outline'}
            onClick={() => handleStatusFilterChange('closed')}
          >
            Closed
          </Button>
        </ButtonGroup>

        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full pr-9 pl-9 sm:w-64"
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSearchChange('')}
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0 hover:bg-muted"
            >
              <XIcon className="h-3 w-3" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>

        <Select value={minAmountFilter} onValueChange={handleAmountFilterChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Min amount: None</SelectItem>
            <SelectItem value="10">$10</SelectItem>
            <SelectItem value="100">$100</SelectItem>
            <SelectItem value="1000">$1,000</SelectItem>
            <SelectItem value="10000">$10,000</SelectItem>
            <SelectItem value="100000">$100,000</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

interface FetchUserPositionsParams {
  pageParam: number
  userAddress: string
  status: 'active' | 'closed'
  minAmountFilter: string
  searchQuery?: string
}

async function fetchUserPositions({
  pageParam,
  userAddress,
  status,
  minAmountFilter,
  searchQuery,
}: FetchUserPositionsParams): Promise<UserPosition[]> {
  const params = new URLSearchParams({
    limit: '50',
    offset: pageParam.toString(),
    status,
  })

  if (minAmountFilter && minAmountFilter !== 'All') {
    params.set('minAmount', minAmountFilter)
  }

  if (searchQuery && searchQuery.trim()) {
    params.set('search', searchQuery.trim())
  }

  const controller = new AbortController()

  const response = await fetch(`/api/users/${encodeURIComponent(userAddress)}/positions?${params}`, {
    signal: controller.signal,
  })

  if (!response.ok) {
    throw new Error('Server error occurred. Please try again later.')
  }

  const result = await response.json()
  return result.data || []
}

interface PublicPositionsListProps {
  userAddress: string
}

export default function PublicPositionsList({ userAddress }: PublicPositionsListProps) {
  const queryClient = useQueryClient()
  const parentRef = useRef<HTMLDivElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [hasInitialized, setHasInitialized] = useState(false)
  const [marketStatusFilter, setMarketStatusFilter] = useState<'active' | 'closed'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [minAmountFilter, setMinAmountFilter] = useState('All')
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [scrollMargin, setScrollMargin] = useState(0)

  const handleStatusFilterChange = useCallback((newStatus: 'active' | 'closed') => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setInfiniteScrollError(null)
    setHasInitialized(false)
    setIsLoadingMore(false)
    setRetryCount(0)

    setMarketStatusFilter(newStatus)

    queryClient.invalidateQueries({
      queryKey: ['user-positions', userAddress],
    })
  }, [queryClient, userAddress])

  const handleSearchChange = useCallback((query: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setInfiniteScrollError(null)
    setHasInitialized(false)
    setIsLoadingMore(false)
    setRetryCount(0)
    setSearchQuery(query)
  }, [])

  const handleAmountFilterChange = useCallback((newFilter: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setInfiniteScrollError(null)
    setHasInitialized(false)
    setIsLoadingMore(false)
    setRetryCount(0)

    setMinAmountFilter(newFilter)

    queryClient.invalidateQueries({
      queryKey: ['user-positions', userAddress],
    })
  }, [queryClient, userAddress])

  useEffect(() => {
    queueMicrotask(() => {
      setHasInitialized(false)
      setInfiniteScrollError(null)
      setIsLoadingMore(false)
      setMarketStatusFilter('active')
      setSearchQuery('')
      setMinAmountFilter('All')
      setRetryCount(0)
    })
  }, [userAddress])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['user-positions', userAddress, marketStatusFilter, minAmountFilter, debouncedSearchQuery],
    queryFn: ({ pageParam = 0 }) =>
      fetchUserPositions({
        pageParam,
        userAddress,
        status: marketStatusFilter,
        minAmountFilter,
        searchQuery: debouncedSearchQuery,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 50) {
        return allPages.reduce((total, page) => total + page.length, 0)
      }
      return undefined
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })

  const positions = data?.pages.flat() ?? []
  const loading = status === 'pending'
  const hasInitialError = status === 'error'

  const isSearchActive = debouncedSearchQuery.trim().length > 0

  useEffect(() => {
    if (parentRef.current) {
      setScrollMargin(parentRef.current.offsetTop)
    }
  }, [])

  useEffect(() => {
    setHasInitialized(false)
    setInfiniteScrollError(null)
    setIsLoadingMore(false)

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [debouncedSearchQuery, minAmountFilter, marketStatusFilter])

  const virtualizer = useWindowVirtualizer({
    count: positions.length,
    estimateSize: () => {
      if (typeof window !== 'undefined') {
        return window.innerWidth < 768 ? 110 : 70
      }
      return 70
    },
    scrollMargin,
    overscan: 5,
    onChange: (instance) => {
      if (!hasInitialized && positions.length > 0) {
        setHasInitialized(true)
        return
      }

      if (!hasInitialized || positions.length === 0) {
        return
      }

      const items = instance.getVirtualItems()
      const lastItem = items[items.length - 1]

      const shouldLoadMore = lastItem
        && lastItem.index >= positions.length - 5
        && hasNextPage
        && !isFetchingNextPage
        && !isLoadingMore
        && !infiniteScrollError
        && status !== 'pending'

      if (shouldLoadMore) {
        setIsLoadingMore(true)
        setInfiniteScrollError(null)

        abortControllerRef.current = new AbortController()

        fetchNextPage()
          .then(() => {
            setIsLoadingMore(false)
            setRetryCount(0)
          })
          .catch((error) => {
            setIsLoadingMore(false)
            if (error.name !== 'AbortError') {
              const errorMessage = error.message || 'Failed to load more positions'
              setInfiniteScrollError(errorMessage)
            }
          })
      }
    },
  })

  const retryInfiniteScroll = useCallback(() => {
    setInfiniteScrollError(null)
    setIsLoadingMore(true)

    const currentRetryCount = retryCount + 1
    setRetryCount(currentRetryCount)

    const delay = Math.min(1000 * 2 ** (currentRetryCount - 1), 8000)

    abortControllerRef.current = new AbortController()

    setTimeout(() => {
      fetchNextPage()
        .then(() => {
          setIsLoadingMore(false)
          setRetryCount(0)
        })
        .catch((error) => {
          setIsLoadingMore(false)
          if (error.name !== 'AbortError') {
            const errorMessage = debouncedSearchQuery.trim()
              ? `Failed to load more search results for "${debouncedSearchQuery}"`
              : 'Failed to load more positions'
            setInfiniteScrollError(errorMessage)
          }
        })
    }, delay)
  }, [fetchNextPage, debouncedSearchQuery, retryCount])

  const retryInitialLoad = useCallback(() => {
    const currentRetryCount = retryCount + 1
    setRetryCount(currentRetryCount)
    setInfiniteScrollError(null)
    setIsLoadingMore(false)
    setHasInitialized(false)

    const delay = Math.min(1000 * 2 ** (currentRetryCount - 1), 8000)

    setTimeout(() => {
      void refetch()
    }, delay)
  }, [refetch, retryCount])

  if (hasInitialError) {
    return (
      <div className="grid gap-6">
        <PositionsFilterControls
          marketStatusFilter={marketStatusFilter}
          searchQuery={searchQuery}
          minAmountFilter={minAmountFilter}
          handleStatusFilterChange={handleStatusFilterChange}
          handleSearchChange={handleSearchChange}
          handleAmountFilterChange={handleAmountFilterChange}
        />

        <PublicPositionsError
          isSearchActive={isSearchActive}
          searchQuery={debouncedSearchQuery}
          retryCount={retryCount}
          isLoading={loading}
          onRetry={retryInitialLoad}
          onRefreshPage={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <div ref={parentRef} className="space-y-6">
      {/* Filter Controls */}
      <PositionsFilterControls
        marketStatusFilter={marketStatusFilter}
        searchQuery={searchQuery}
        minAmountFilter={minAmountFilter}
        handleStatusFilterChange={handleStatusFilterChange}
        handleSearchChange={handleSearchChange}
        handleAmountFilterChange={handleAmountFilterChange}
      />

      {/* Column Headers */}
      <div className={`
        mb-2 flex items-center gap-3 px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase
        sm:gap-4 sm:px-5
      `}
      >
        <div className="flex-1">Market</div>
        <div className="text-right">Avg</div>
        <div className="text-right">Value</div>
      </div>

      {loading && (
        <PositionsLoadingState
          skeletonCount={8}
          isSearchActive={isSearchActive}
          searchQuery={debouncedSearchQuery}
          marketStatusFilter={marketStatusFilter}
          retryCount={retryCount}
        />
      )}

      {!loading && positions.length === 0 && (
        <PublicPositionsEmpty
          searchQuery={debouncedSearchQuery}
          minAmountFilter={minAmountFilter}
          marketStatusFilter={marketStatusFilter}
          onClearSearch={() => handleSearchChange('')}
          onClearAmountFilter={() => handleAmountFilterChange('All')}
        />
      )}

      {!loading && positions.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
              width: '100%',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const position = positions[virtualItem.index]
              if (!position) {
                return null
              }

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${
                      virtualItem.start
                      - (virtualizer.options.scrollMargin ?? 0)
                    }px)`,
                  }}
                >
                  <PositionItem item={position} />
                </div>
              )
            })}
          </div>

          {(isFetchingNextPage || isLoadingMore) && (
            <PositionsInfiniteScrollSkeleton skeletonCount={3} />
          )}

          {!hasNextPage && positions.length > 0 && !isFetchingNextPage && !isLoadingMore && (
            <div className="border-t bg-muted/20 p-6 text-center">
              <div className="space-y-3">
                <div className="text-sm font-medium text-foreground">
                  You've reached the end
                </div>
                <div className="text-xs text-muted-foreground">
                  {debouncedSearchQuery.trim()
                    ? `All ${positions.length} result${positions.length === 1 ? '' : 's'} for "${debouncedSearchQuery}" loaded`
                    : minAmountFilter && minAmountFilter !== 'All'
                      ? `Showing all ${marketStatusFilter} positions with minimum value of $${minAmountFilter}`
                      : `All ${positions.length} ${marketStatusFilter} position${positions.length === 1 ? '' : 's'} loaded`}
                </div>

                {debouncedSearchQuery.trim() && (
                  <div className={`
                    mt-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium
                    text-orange-800
                    dark:bg-orange-900/30 dark:text-orange-300
                  `}
                  >
                    <SearchIcon className="size-3" />
                    Search: "
                    {debouncedSearchQuery}
                    "
                  </div>
                )}
              </div>
            </div>
          )}

          {infiniteScrollError && (
            <PublicPositionsInfiniteScrollError
              searchQuery={debouncedSearchQuery}
              retryCount={retryCount}
              isLoadingMore={isLoadingMore}
              onRetry={retryInfiniteScroll}
              onStartOver={() => {
                setInfiniteScrollError(null)
                setRetryCount(0)
                queryClient.invalidateQueries({
                  queryKey: ['user-positions', userAddress, marketStatusFilter, minAmountFilter, debouncedSearchQuery],
                })
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
