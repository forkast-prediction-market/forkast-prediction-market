import type { HistorySort, HistoryTypeFilter } from '@/app/(platform)/[username]/_types/PublicHistoryTypes'
import type { DataApiActivity } from '@/lib/data-api/user'
import type { ActivityOrder } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import { resolveHistorySort, resolveHistoryTypeParams } from '@/app/(platform)/[username]/_utils/PublicHistoryUtils'
import { mapDataApiActivityToActivityOrder } from '@/lib/data-api/user'

const DATA_API_URL = process.env.DATA_URL!

async function fetchUserHistory({
  pageParam,
  userAddress,
  typeFilter,
  sortFilter,
  signal,
}: {
  pageParam: number
  userAddress: string
  typeFilter: HistoryTypeFilter
  sortFilter: HistorySort
  signal?: AbortSignal
}): Promise<ActivityOrder[]> {
  const { sortBy, sortDirection } = resolveHistorySort(sortFilter)
  const { type, side } = resolveHistoryTypeParams(typeFilter)

  const params = new URLSearchParams({
    user: userAddress,
    limit: '100',
    offset: pageParam.toString(),
    sortBy,
    sortDirection,
  })
  if (type) {
    params.set('type', type)
  }
  if (side) {
    params.set('side', side)
  }

  const response = await fetch(`${DATA_API_URL}/activity?${params.toString()}`, { signal })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const errorMessage = errorBody?.error || 'Failed to load activity.'
    throw new Error(errorMessage)
  }

  const result = await response.json()
  if (!Array.isArray(result)) {
    throw new TypeError('Unexpected response from data service.')
  }

  return (result as DataApiActivity[]).map(mapDataApiActivityToActivityOrder)
}

export function usePublicHistoryQuery({
  userAddress,
  typeFilter,
  sortFilter,
}: {
  userAddress: string
  typeFilter: HistoryTypeFilter
  sortFilter: HistorySort
}) {
  return useInfiniteQuery<ActivityOrder[]>({
    queryKey: ['user-history', userAddress, typeFilter, sortFilter],
    queryFn: ({ pageParam = 0, signal }) => fetchUserHistory({
      pageParam: pageParam as number,
      userAddress,
      typeFilter,
      sortFilter,
      signal,
    }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 100) {
        return allPages.reduce((total, page) => total + page.length, 0)
      }
      return undefined
    },
    initialPageParam: 0,
    enabled: Boolean(userAddress),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  })
}
