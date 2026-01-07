import type { PortfolioUserOpenOrder } from '@/app/(platform)/portfolio/_types/PortfolioOpenOrdersTypes'
import { useInfiniteQuery } from '@tanstack/react-query'

async function fetchOpenOrders({
  pageParam,
  filters,
  signal,
}: {
  pageParam: number
  filters?: { id?: string, market?: string, assetId?: string }
  signal?: AbortSignal
}): Promise<PortfolioUserOpenOrder[]> {
  const params = new URLSearchParams({
    limit: '50',
    offset: pageParam.toString(),
  })
  if (filters?.id) {
    params.set('id', filters.id)
  }
  if (filters?.market) {
    params.set('market', filters.market)
  }
  if (filters?.assetId) {
    params.set('asset_id', filters.assetId)
  }

  const response = await fetch(`/api/open-orders?${params.toString()}`, { signal })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || 'Failed to load open orders')
  }
  const payload = await response.json()
  return payload.data ?? []
}

export function usePortfolioOpenOrdersQuery({
  userAddress,
  apiSearchKey,
  apiSearchFilters,
}: {
  userAddress: string
  apiSearchKey: string
  apiSearchFilters: { id?: string, market?: string, assetId?: string }
}) {
  return useInfiniteQuery<PortfolioUserOpenOrder[]>({
    queryKey: ['public-open-orders', userAddress, apiSearchKey],
    queryFn: ({ pageParam = 0, signal }) => fetchOpenOrders({
      pageParam: pageParam as number,
      filters: apiSearchFilters,
      signal,
    }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 50) {
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
