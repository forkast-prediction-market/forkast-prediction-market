import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getUserOpenOrdersBySlug: vi.fn(),
}))

vi.mock('@/lib/db/queries/user', () => ({
  UserRepository: { getCurrentUser: (...args: any[]) => mocks.getCurrentUser(...args) },
}))

vi.mock('@/lib/db/queries/event', () => ({
  EventRepository: { getUserOpenOrdersBySlug: (...args: any[]) => mocks.getUserOpenOrdersBySlug(...args) },
}))

const { GET } = await import('@/app/(platform)/api/events/[slug]/open-orders/route')

describe('open orders route', () => {
  it('requires a slug param', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 'user-1' })

    const response = await GET(new Request('https://example.com'), { params: Promise.resolve({ slug: '' }) })
    expect(response.status).toBe(422)
  })

  it('returns empty list for unauthenticated user', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null)

    const response = await GET(new Request('https://example.com'), { params: Promise.resolve({ slug: 'event' }) })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: [] })
  })

  it('validates pagination and forwards conditionId', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 'user-1' })
    mocks.getUserOpenOrdersBySlug.mockResolvedValueOnce({ data: [{ id: 1 }], error: null })

    const response = await GET(
      new Request('https://example.com?limit=999&offset=-10&conditionId=%20cond-1%20'),
      { params: Promise.resolve({ slug: 'event' }) },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: [{ id: 1 }] })
    expect(mocks.getUserOpenOrdersBySlug).toHaveBeenCalledWith({
      slug: 'event',
      userId: 'user-1',
      limit: 100,
      offset: 0,
      conditionId: 'cond-1',
    })
  })

  it('returns 500 when repository fails', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 'user-1' })
    mocks.getUserOpenOrdersBySlug.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })

    const response = await GET(new Request('https://example.com'), { params: Promise.resolve({ slug: 'event' }) })
    expect(response.status).toBe(500)
  })
})
