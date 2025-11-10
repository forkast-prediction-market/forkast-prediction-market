import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserOutcomePositions } from '@/hooks/useUserOutcomePositions'
import { OUTCOME_INDEX } from '@/lib/constants'

describe('useUserOutcomePositions', () => {
  const originalFetch = globalThis.fetch
  let fetchMock: ReturnType<typeof vi.fn>
  let queryClient: QueryClient

  beforeEach(() => {
    fetchMock = vi.fn()
    globalThis.fetch = fetchMock as any
    queryClient = new QueryClient()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    queryClient.clear()
  })

  function render(slug?: string, userId?: string) {
    return renderHook(
      () => useUserOutcomePositions({ eventSlug: slug, userId }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      },
    )
  }

  it('normalizes API payloads into decimal shares', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            condition_id: 'cond-1',
            shares_micro: '2500000',
            outcome_index: OUTCOME_INDEX.YES,
          },
          {
            condition_id: 'cond-1',
            shares_micro: '1250000',
            outcome_index: OUTCOME_INDEX.NO,
          },
        ],
      }),
    })

    const { result } = render('event-1', 'user-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.sharesByCondition).toEqual({
      'cond-1': {
        [OUTCOME_INDEX.YES]: 2.5,
        [OUTCOME_INDEX.NO]: 1.25,
      },
    })
  })

  it('skips fetching when userId is missing', async () => {
    const { result } = render('event-1', undefined)

    expect(result.current.sharesByCondition).toEqual({})
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
