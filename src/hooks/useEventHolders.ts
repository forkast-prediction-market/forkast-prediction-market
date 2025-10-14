import type { HoldersResponse } from '@/types'
import { useQuery } from '@tanstack/react-query'

async function fetchEventHolders(eventSlug: string, conditionId?: string): Promise<HoldersResponse> {
  const params = new URLSearchParams()
  if (conditionId) {
    params.set('condition_id', conditionId)
  }

  const url = `/api/events/${eventSlug}/holders${params.toString() ? `?${params}` : ''}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to load holders')
  }

  return response.json()
}

export function useEventHolders(eventSlug: string, conditionId?: string) {
  return useQuery({
    queryKey: conditionId
      ? ['event-holders', eventSlug, conditionId]
      : ['event-holders', eventSlug],
    queryFn: () => fetchEventHolders(eventSlug, conditionId),
    enabled: true,
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    retry: 3,
  })
}
