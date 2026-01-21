import { useQuery } from '@tanstack/react-query'
import { fetchOrderBookSummaries } from '@/app/[locale]/(platform)/event/[slug]/_utils/EventOrderBookUtils'

export function useOrderBookSummaries(tokenIds: string[], options?: { enabled?: boolean }) {
  const tokenIdsKey = tokenIds.slice().sort().join(',')
  const shouldEnable = options?.enabled ?? true

  return useQuery({
    queryKey: ['orderbook-summary', tokenIdsKey],
    queryFn: () => fetchOrderBookSummaries(tokenIds),
    enabled: shouldEnable && tokenIds.length > 0 && Boolean(process.env.CLOB_URL),
    staleTime: 10_000,
    gcTime: 60_000,
    retry: 1,
  })
}
