import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildClobHmacSignature: vi.fn(() => 'sig'),
  getUserTradingAuthSecrets: vi.fn(),
  getCurrentUser: vi.fn(),
  findUserOrderById: vi.fn(),
  cancelOrder: vi.fn(),
}))

vi.mock('@/lib/hmac', () => ({
  buildClobHmacSignature: mocks.buildClobHmacSignature,
}))

vi.mock('@/lib/trading-auth/server', () => ({
  getUserTradingAuthSecrets: mocks.getUserTradingAuthSecrets,
}))

vi.mock('@/lib/db/queries/user', () => ({
  UserRepository: { getCurrentUser: (...args: any[]) => mocks.getCurrentUser(...args) },
}))

vi.mock('@/lib/db/queries/order', () => ({
  OrderRepository: {
    findUserOrderById: (...args: any[]) => mocks.findUserOrderById(...args),
    cancelOrder: (...args: any[]) => mocks.cancelOrder(...args),
  },
}))

describe('cancelOrderAction', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.buildClobHmacSignature.mockReset()
    mocks.getUserTradingAuthSecrets.mockReset()
    mocks.getCurrentUser.mockReset()
    mocks.findUserOrderById.mockReset()
    mocks.cancelOrder.mockReset()
  })

  it('rejects unauthenticated users', async () => {
    process.env.CLOB_URL = 'https://clob.local'
    mocks.getCurrentUser.mockResolvedValueOnce(null)

    const { cancelOrderAction } = await import('@/app/(platform)/event/[slug]/_actions/cancel-order')
    expect(await cancelOrderAction('order-1')).toEqual({ error: 'Unauthenticated.' })
  })

  it('requires trading auth and proxy wallet', async () => {
    process.env.CLOB_URL = 'https://clob.local'
    mocks.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      address: '0x0000000000000000000000000000000000000001',
      proxy_wallet_address: null,
    })
    mocks.getUserTradingAuthSecrets.mockResolvedValueOnce({ clob: null })

    const { cancelOrderAction } = await import('@/app/(platform)/event/[slug]/_actions/cancel-order')
    expect(await cancelOrderAction('order-1')).toEqual({ error: 'Please enable trading first.' })

    mocks.getUserTradingAuthSecrets.mockResolvedValueOnce({ clob: { key: 'k', passphrase: 'p', secret: 's' } })
    expect(await cancelOrderAction('order-1')).toEqual({ error: 'Deploy your proxy wallet before trading.' })
  })

  it('validates the order id and ownership/status', async () => {
    process.env.CLOB_URL = 'https://clob.local'
    const user = {
      id: 'user-1',
      address: '0x0000000000000000000000000000000000000001',
      proxy_wallet_address: '0x0000000000000000000000000000000000000002',
    }
    mocks.getCurrentUser.mockResolvedValue(user)
    mocks.getUserTradingAuthSecrets.mockResolvedValue({ clob: { key: 'k', passphrase: 'p', secret: 's' } })

    const { cancelOrderAction } = await import('@/app/(platform)/event/[slug]/_actions/cancel-order')
    expect(await cancelOrderAction('')).toEqual({ error: 'Order id is required.' })

    mocks.findUserOrderById.mockResolvedValueOnce({ data: null, error: null })
    expect(await cancelOrderAction('order-1')).toEqual({ error: 'Order not found.' })

    mocks.findUserOrderById.mockResolvedValueOnce({ data: { id: '1', status: 'matched' }, error: null })
    expect(await cancelOrderAction('order-1')).toEqual({ error: 'This order can no longer be cancelled.' })
  })

  it('maps CLOB HTTP errors to user-facing messages', async () => {
    process.env.CLOB_URL = 'https://clob.local'
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 'user-1',
      address: '0x0000000000000000000000000000000000000001',
      proxy_wallet_address: '0x0000000000000000000000000000000000000002',
    })
    mocks.getUserTradingAuthSecrets.mockResolvedValueOnce({ clob: { key: 'k', passphrase: 'p', secret: 's' } })
    mocks.findUserOrderById.mockResolvedValueOnce({ data: { id: 'local', status: 'live', clob_order_id: 'clob-1' }, error: null })

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'not found' }),
    }) as any

    const { cancelOrderAction } = await import('@/app/(platform)/event/[slug]/_actions/cancel-order')
    expect(await cancelOrderAction('order-1')).toEqual({ error: 'Order not found.' })
  })

  it('cancels remotely then marks the local order cancelled', async () => {
    process.env.CLOB_URL = 'https://clob.local'
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 'user-1',
      address: '0x0000000000000000000000000000000000000001',
      proxy_wallet_address: '0x0000000000000000000000000000000000000002',
    })
    mocks.getUserTradingAuthSecrets.mockResolvedValueOnce({ clob: { key: 'k', passphrase: 'p', secret: 's' } })
    mocks.findUserOrderById.mockResolvedValueOnce({ data: { id: 'local', status: 'pending', clob_order_id: 'clob-1' }, error: null })

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as any
    mocks.cancelOrder.mockResolvedValueOnce({ error: null })

    const { cancelOrderAction } = await import('@/app/(platform)/event/[slug]/_actions/cancel-order')
    expect(await cancelOrderAction('order-1')).toEqual({ error: null })
    expect(mocks.cancelOrder).toHaveBeenCalledWith('local', 'user-1')
  })
})
