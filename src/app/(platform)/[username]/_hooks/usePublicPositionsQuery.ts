import type { PublicPosition } from '@/app/(platform)/[username]/_components/PublicPositionItem'
import type { SortDirection, SortOption } from '@/app/(platform)/[username]/_types/PublicPositionsTypes'
import { useInfiniteQuery } from '@tanstack/react-query'
import { isClientOnlySort, mapDataApiPosition, resolvePositionsSearchParams, resolvePositionsSortParams } from '@/app/(platform)/[username]/_utils/PublicPositionsUtils'

const DATA_API_URL = process.env.DATA_URL!

async function fetchUserPositions({
  pageParam,
  userAddress,
  status,
  minAmountFilter,
  sortBy,
  sortDirection,
  searchQuery,
  signal,
}: {
  pageParam: number
  userAddress: string
  status: 'active' | 'closed'
  minAmountFilter: string
  sortBy: SortOption
  sortDirection: SortDirection
  searchQuery?: string
  signal?: AbortSignal
}): Promise<PublicPosition[]> {
  const endpoint = status === 'active' ? '/positions' : '/closed-positions'
  const { sortBy: apiSortBy, sortDirection: apiSortDirection } = resolvePositionsSortParams(sortBy, sortDirection)
  const { market, title } = resolvePositionsSearchParams(searchQuery ?? '')
  const shouldApplySort = status === 'active' && !isClientOnlySort(sortBy)
  const params = new URLSearchParams({
    user: userAddress,
    limit: '50',
    offset: pageParam.toString(),
  })

  if (status === 'active') {
    if (minAmountFilter && minAmountFilter !== 'All') {
      params.set('sizeThreshold', minAmountFilter)
    }
    else {
      params.set('sizeThreshold', '0')
    }
    if (shouldApplySort) {
      params.set('sortBy', apiSortBy)
      params.set('sortDirection', apiSortDirection)
    }
    if (market) {
      params.set('market', market)
    }
    else if (title) {
      params.set('title', title)
    }
  }

  if (status === 'closed') {
    params.set('sortBy', 'TIMESTAMP')
    params.set('sortDirection', 'DESC')
    if (market) {
      params.set('market', market)
    }
    else if (title) {
      params.set('title', title)
    }
  }

  async function requestPositions(requestParams: URLSearchParams) {
    const response = await fetch(`${DATA_API_URL}${endpoint}?${requestParams.toString()}`, { signal })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null)
      const errorMessage = errorBody?.error || 'Server error occurred. Please try again later.'
      throw new Error(errorMessage)
    }

    const result = await response.json()
    if (!Array.isArray(result)) {
      throw new TypeError('Unexpected response from data service.')
    }

    return result.map(item => mapDataApiPosition(item, status))
  }

  try {
    return await requestPositions(params)
  }
  catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    const shouldRetry = (message.includes('sortby') || message.includes('sortdirection') || message.includes('unknown_field'))
      && (params.has('sortBy') || params.has('sortDirection'))
    if (!shouldRetry) {
      throw error
    }

    const fallbackParams = new URLSearchParams(params.toString())
    fallbackParams.delete('sortBy')
    fallbackParams.delete('sortDirection')
    return requestPositions(fallbackParams)
  }
}

export function usePublicPositionsQuery({
  userAddress,
  status,
  minAmountFilter,
  sortBy,
  sortDirection,
  searchQuery,
}: {
  userAddress: string
  status: 'active' | 'closed'
  minAmountFilter: string
  sortBy: SortOption
  sortDirection: SortDirection
  searchQuery: string
}) {
  return useInfiniteQuery<PublicPosition[]>({
    queryKey: ['user-positions', userAddress, status, minAmountFilter, searchQuery, sortBy, sortDirection],
    queryFn: ({ pageParam = 0, signal }) =>
      fetchUserPositions({
        pageParam: pageParam as unknown as number,
        userAddress,
        status,
        minAmountFilter,
        sortBy,
        sortDirection,
        searchQuery,
        signal,
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
    refetchInterval: 60_000,
    enabled: Boolean(userAddress),
  })
}
