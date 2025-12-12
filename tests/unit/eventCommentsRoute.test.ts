import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getIdBySlug: vi.fn(),
  getCurrentUser: vi.fn(),
  getEventComments: vi.fn(),
  getUsersByIds: vi.fn(),
  getCommentsIdsLikedByUser: vi.fn(),
  getSupabaseImageUrl: vi.fn((path: string) => `supabase:${path}`),
}))

vi.mock('@/lib/db/queries/event', () => ({
  EventRepository: { getIdBySlug: (...args: any[]) => mocks.getIdBySlug(...args) },
}))

vi.mock('@/lib/db/queries/user', () => ({
  UserRepository: {
    getCurrentUser: (...args: any[]) => mocks.getCurrentUser(...args),
    getUsersByIds: (...args: any[]) => mocks.getUsersByIds(...args),
  },
}))

vi.mock('@/lib/db/queries/comment', () => ({
  CommentRepository: {
    getEventComments: (...args: any[]) => mocks.getEventComments(...args),
    getCommentsIdsLikedByUser: (...args: any[]) => mocks.getCommentsIdsLikedByUser(...args),
  },
}))

vi.mock('@/lib/supabase', () => ({
  getSupabaseImageUrl: (path: string) => mocks.getSupabaseImageUrl(path),
}))

const { GET } = await import('@/app/(platform)/api/events/[slug]/comments/route')

describe('event comments route', () => {
  it('returns 404 when event is not found', async () => {
    mocks.getIdBySlug.mockResolvedValueOnce({ data: null, error: { message: 'nope' } })
    const response = await GET(new Request('https://example.com'), { params: Promise.resolve({ slug: 'event' }) })
    expect(response.status).toBe(404)
  })

  it('returns comments without like flags when user is not logged in', async () => {
    mocks.getIdBySlug.mockResolvedValueOnce({ data: { id: 'event-1' }, error: null })
    mocks.getCurrentUser.mockResolvedValueOnce(null)

    mocks.getEventComments.mockResolvedValueOnce({
      data: [{
        id: 'c1',
        user_id: 'u1',
        user_address: '0xabc',
        user_avatar: 'avatars/a.png',
        replies_count: 5,
        recent_replies: Array.from({ length: 5 }).map((_, i) => ({
          id: `r${i}`,
          user_id: `u${i + 2}`,
          user_address: `0x${i}`,
          user_avatar: null,
        })),
      }],
      error: null,
    })

    mocks.getUsersByIds.mockResolvedValueOnce({
      data: [
        { id: 'u1', proxy_wallet_address: '0xproxy1' },
        { id: 'u2', proxy_wallet_address: null },
      ],
    })

    const response = await GET(new Request('https://example.com?limit=20&offset=0'), { params: Promise.resolve({ slug: 'event' }) })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0].user_avatar).toBe('supabase:avatars/a.png')
    expect(body[0].user_proxy_wallet_address).toBe('0xproxy1')
    expect(body[0].user_has_liked).toBe(false)
    expect(body[0].recent_replies).toHaveLength(3)
    expect(body[0].recent_replies[0].user_has_liked).toBe(false)
  })

  it('returns like flags for logged-in users', async () => {
    mocks.getIdBySlug.mockResolvedValueOnce({ data: { id: 'event-1' }, error: null })
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 'me', user_avatar: 'me' })

    mocks.getEventComments.mockResolvedValueOnce({
      data: [{
        id: 'c1',
        user_id: 'me',
        user_address: '0xabc',
        user_avatar: null,
        replies_count: 1,
        recent_replies: [{
          id: 'r1',
          user_id: 'u2',
          user_address: '0xdef',
          user_avatar: null,
        }],
      }],
      error: null,
    })

    mocks.getUsersByIds.mockResolvedValueOnce({
      data: [
        { id: 'me', proxy_wallet_address: '0xproxyMe' },
        { id: 'u2', proxy_wallet_address: null },
      ],
    })

    mocks.getCommentsIdsLikedByUser.mockResolvedValueOnce({
      data: [{ comment_id: 'c1' }, { comment_id: 'r1' }],
      error: null,
    })

    const response = await GET(new Request('https://example.com'), { params: Promise.resolve({ slug: 'event' }) })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body[0].is_owner).toBe(true)
    expect(body[0].user_has_liked).toBe(true)
    expect(body[0].recent_replies[0].user_has_liked).toBe(true)
    expect(body[0].recent_replies[0].user_avatar).toBe('https://avatar.vercel.sh/0xdef.png')
  })
})
