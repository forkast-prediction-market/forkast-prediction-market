import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => {
  const marketsLimitMock = vi.fn()
  const outcomesInMock = vi.fn()
  const marketsUpdateEqMock = vi.fn()
  const marketsUpdateMock = vi.fn(() => ({ eq: marketsUpdateEqMock }))

  const marketsChain: any = {}
  marketsChain.select = vi.fn(() => marketsChain)
  marketsChain.order = vi.fn(() => marketsChain)
  marketsChain.limit = marketsLimitMock
  marketsChain.update = marketsUpdateMock

  const outcomesChain: any = {}
  outcomesChain.select = vi.fn(() => outcomesChain)
  outcomesChain.in = outcomesInMock

  const from = vi.fn((table: string) => {
    if (table === 'markets') {
      return marketsChain
    }
    if (table === 'outcomes') {
      return outcomesChain
    }
    return marketsChain
  })

  return {
    supabaseAdmin: { from },
    __mocks: {
      from,
      marketsChain,
      outcomesChain,
      marketsLimitMock,
      outcomesInMock,
      marketsUpdateEqMock,
      marketsUpdateMock,
    },
  }
})

const { __mocks } = await import('@/lib/supabase') as any
const helpersModule = await import('@/app/api/sync/orders/helpers')
const { GET } = await import('@/app/api/sync/volume/route')

describe('volume sync route', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    __mocks.from.mockClear()
    __mocks.marketsChain.select.mockClear()
    __mocks.marketsChain.order.mockClear()
    __mocks.marketsLimitMock.mockReset()
    __mocks.marketsUpdateMock.mockClear()
    __mocks.marketsUpdateEqMock.mockClear()
    __mocks.outcomesChain.select.mockClear()
    __mocks.outcomesInMock.mockReset()
    globalThis.fetch = vi.fn() as any
    process.env.CRON_SECRET = 'secret'
    process.env.CLOB_URL = 'https://clob.example'
  })

  it('returns stats payload on successful sync and clamps limit', async () => {
    __mocks.marketsLimitMock.mockResolvedValue({
      data: [
        { condition_id: 'cond-1', volume_24h: '0', volume: '0' },
      ],
      error: null,
    })

    __mocks.outcomesInMock.mockResolvedValue({
      data: [
        { condition_id: 'cond-1', token_id: 'token-a' },
        { condition_id: 'cond-1', token_id: 'token-b' },
      ],
      error: null,
    })

    __mocks.marketsUpdateEqMock.mockResolvedValue({ error: null })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([
        { condition_id: 'cond-1', status: 200, volume: '12.5', volume_24h: '3.4' },
      ]),
    })
    globalThis.fetch = fetchMock as any

    const request = new Request('https://example.com/sync/volume?limit=999', {
      headers: { authorization: 'Bearer secret' },
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      scanned: 1,
      updated: 1,
      skipped: 0,
      timeLimitReached: false,
    })
    expect(__mocks.marketsLimitMock).toHaveBeenCalledWith(helpersModule.MAX_ORDER_SYNC_LIMIT)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(__mocks.marketsUpdateEqMock).toHaveBeenCalledTimes(1)
  })

  it('returns 401 when cron auth is missing', async () => {
    const request = new Request('https://example.com/sync/volume')
    const response = await GET(request)
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthenticated.' })
  })

  it('surfaces CLOB errors without updating markets', async () => {
    __mocks.marketsLimitMock.mockResolvedValue({
      data: [
        { condition_id: 'cond-err', volume_24h: '0', volume: '0' },
      ],
      error: null,
    })
    __mocks.outcomesInMock.mockResolvedValue({
      data: [
        { condition_id: 'cond-err', token_id: 'token-a' },
        { condition_id: 'cond-err', token_id: 'token-b' },
      ],
      error: null,
    })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([
        { condition_id: 'cond-err', status: 400, error: 'token_ids_must_have_two_entries' },
      ]),
    })
    globalThis.fetch = fetchMock as any

    const request = new Request('https://example.com/sync/volume', {
      headers: { authorization: 'Bearer secret' },
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.errors).toEqual([
      { context: 'volume:cond-err', error: 'token_ids_must_have_two_entries' },
    ])
    expect(body.updated).toBe(0)
    expect(__mocks.marketsUpdateEqMock).not.toHaveBeenCalled()
  })

  it('stops when time limit is reached before processing batches', async () => {
    __mocks.marketsLimitMock.mockResolvedValue({
      data: [
        { condition_id: 'cond-1', volume_24h: '0', volume: '0' },
      ],
      error: null,
    })
    __mocks.outcomesInMock.mockResolvedValue({
      data: [
        { condition_id: 'cond-1', token_id: 'token-a' },
        { condition_id: 'cond-1', token_id: 'token-b' },
      ],
      error: null,
    })

    const dateNowSpy = vi.spyOn(Date, 'now')
    dateNowSpy
      .mockReturnValueOnce(0) // startedAt
      .mockReturnValue(helpersModule.SYNC_TIME_LIMIT_MS + 1) // loop check

    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as any

    const request = new Request('https://example.com/sync/volume', {
      headers: { authorization: 'Bearer secret' },
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.timeLimitReached).toBe(true)
    expect(body.updated).toBe(0)
    expect(fetchMock).not.toHaveBeenCalled()
    dateNowSpy.mockRestore()
  })
})
