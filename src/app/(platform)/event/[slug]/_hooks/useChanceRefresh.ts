import type { QueryKey } from '@tanstack/react-query'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useRef, useState } from 'react'

interface UseChanceRefreshOptions {
  queryKey: QueryKey
}

export interface ChanceRefreshResult {
  refresh: () => Promise<{ ok: true } | { ok: false, error?: unknown, reason?: 'IN_PROGRESS' }>
  isRefreshing: boolean
  isFetching: boolean
  isDisabled: boolean
}

export function useChanceRefresh({ queryKey }: UseChanceRefreshOptions): ChanceRefreshResult {
  const queryClient = useQueryClient()
  const isFetching = useIsFetching({ queryKey }) > 0
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isRefreshingRef = useRef(false)

  const isDisabled = useMemo(() => isFetching || isRefreshing, [isFetching, isRefreshing])

  const refresh = useCallback(async () => {
    if (isFetching || isRefreshingRef.current) {
      return { ok: false as const, reason: 'IN_PROGRESS' as const }
    }

    isRefreshingRef.current = true
    setIsRefreshing(true)

    try {
      await queryClient.invalidateQueries({ queryKey, refetchType: 'active' })
      return { ok: true as const }
    }
    catch (error) {
      console.error('Failed to refresh price history', error)
      return { ok: false as const, error }
    }
    finally {
      isRefreshingRef.current = false
      setIsRefreshing(false)
    }
  }, [isFetching, queryClient, queryKey])

  return {
    refresh,
    isDisabled,
    isRefreshing,
    isFetching,
  }
}
