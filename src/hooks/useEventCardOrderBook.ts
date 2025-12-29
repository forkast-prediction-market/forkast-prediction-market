import { useQuery } from '@tanstack/react-query'
import { fetchOrderBookSummary, normalizeBookLevels } from '@/lib/event-card-orderbook'

export function useEventCardOrderBook(selectedTokenId: string | null, enabled: boolean) {
  const orderBookQuery = useQuery({
    queryKey: ['card-orderbook', selectedTokenId],
    enabled: Boolean(selectedTokenId && enabled),
    queryFn: () => fetchOrderBookSummary(selectedTokenId!),
    staleTime: 60_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const normalizedAsks = normalizeBookLevels(orderBookQuery.data?.asks, 'ask')

  return {
    orderBookQuery,
    normalizedAsks,
  }
}
