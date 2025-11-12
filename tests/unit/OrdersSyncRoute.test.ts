import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => {
  const updateEqMock = vi.fn()
  const updateMock = vi.fn(() => ({ eq: updateEqMock }))

  const chain: any = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  chain.limit = vi.fn()
  chain.update = updateMock

  const from = vi.fn(() => chain)

  return {
    supabaseAdmin: { from },
    __mocks: {
      chain,
      updateEqMock,
      updateMock,
      from,
    },
  }
})

vi.mock('@/lib/formatters', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    toMicro: (value: number) => actual.toMicro(value),
  }
})

const { __mocks } = await import('@/lib/supabase') as any
const { GET } = await import('@/app/api/sync/orders/route')

describe('orders sync route (mocked)', () => {
  beforeEach(() => {
    __mocks.from.mockClear()
    __mocks.chain.select.mockClear()
    __mocks.chain.eq.mockClear()
    __mocks.chain.order.mockClear()
    __mocks.chain.limit.mockClear()
    __mocks.updateMock.mockClear()
    __mocks.updateEqMock.mockClear()
    globalThis.fetch = vi.fn() as any
    process.env.CRON_SECRET = 'secret'
  })

  it('returns stats payload on successful sync', async () => {
    __mocks.chain.limit.mockResolvedValue({
      data: [
        { id: 'local-1', clob_order_id: 'clob-1', size_matched: '0' },
      ],
      error: null,
    })

    __mocks.updateEqMock.mockResolvedValue({ data: null, error: null })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([{ order: { id: 'clob-1', status: 'matched', sizeMatched: '1.5' } }]),
    })
    globalThis.fetch = fetchMock as any

    const request = new Request('https://example.com/api/sync/orders', {
      headers: { authorization: 'Bearer secret' },
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      scanned: 1,
      updated: 1,
      skippedLive: 0,
      markedUnmatched: 0,
      timeLimitReached: false,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, fetchOptions] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(fetchOptions?.body).toBe(JSON.stringify([{ orderId: 'clob-1' }]))
    expect(__mocks.updateEqMock).toHaveBeenCalledTimes(1)
  })

  it('returns 401 when cron auth is missing', async () => {
    const request = new Request('https://example.com/api/sync/orders')
    const response = await GET(request)
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ error: 'Unauthenticated.' })
  })

  it('returns 500 when supabase query fails', async () => {
    __mocks.chain.limit.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const request = new Request('https://example.com/api/sync/orders', {
      headers: { authorization: 'Bearer secret' },
    })
    const response = await GET(request)
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.success).toBe(false)
  })
})
