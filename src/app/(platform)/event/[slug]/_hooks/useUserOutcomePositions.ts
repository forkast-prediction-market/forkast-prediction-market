import type { UserMarketOutcomePosition } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { OUTCOME_INDEX } from '@/lib/constants'

export interface SharesByCondition {
  [conditionId: string]: {
    [OUTCOME_INDEX.YES]: number
    [OUTCOME_INDEX.NO]: number
  }
}

interface UseUserOutcomePositionsOptions {
  eventSlug?: string
  userId?: string
}

export function useUserOutcomePositions({ eventSlug, userId }: UseUserOutcomePositionsOptions) {
  const enabled = Boolean(eventSlug && userId)

  const query = useQuery<UserMarketOutcomePosition[]>({
    queryKey: ['user-event-positions', eventSlug, userId],
    enabled,
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventSlug}/user-positions`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Failed to load user positions.')
      }

      const payload = await response.json()
      return (payload.data ?? []) as UserMarketOutcomePosition[]
    },
  })

  const sharesByCondition = useMemo<SharesByCondition>(() => {
    if (!userId || !query.data) {
      return {}
    }

    return query.data.reduce<SharesByCondition>((acc, position) => {
      const rawMicro = typeof position.shares_micro === 'string'
        ? Number(position.shares_micro)
        : Number(position.shares_micro || 0)

      if (!Number.isFinite(rawMicro)) {
        return acc
      }

      const decimalShares = Number((rawMicro / 1_000_000).toFixed(4))
      if (decimalShares <= 0) {
        return acc
      }

      if (!acc[position.condition_id]) {
        acc[position.condition_id] = {
          [OUTCOME_INDEX.YES]: 0,
          [OUTCOME_INDEX.NO]: 0,
        }
      }

      const outcomeKey = position.outcome_index === OUTCOME_INDEX.NO
        ? OUTCOME_INDEX.NO
        : OUTCOME_INDEX.YES

      acc[position.condition_id][outcomeKey] = decimalShares
      return acc
    }, {})
  }, [query.data, userId])

  return {
    ...query,
    sharesByCondition,
  }
}
