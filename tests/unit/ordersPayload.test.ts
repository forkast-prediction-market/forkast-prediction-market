import { afterEach, describe, expect, it, vi } from 'vitest'
import { ORDER_SIDE, ORDER_TYPE } from '@/lib/constants'
import { buildOrderPayload } from '@/lib/orders'

vi.mock('@/app/(platform)/event/[slug]/_actions/store-order', () => ({
  storeOrderAction: vi.fn(),
}))

describe('buildOrderPayload money-safety defaults', () => {
  const userAddress = '0x0000000000000000000000000000000000000001' as const

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('normalizes feeRateBps and expirationTimestamp defensively', () => {
    const payload = buildOrderPayload({
      userAddress,
      outcome: { token_id: '1' } as any,
      side: ORDER_SIDE.BUY,
      orderType: ORDER_TYPE.MARKET,
      amount: '1',
      limitPrice: '0',
      limitShares: '0',
      feeRateBps: -10,
      expirationTimestamp: -50,
    })

    expect(payload.fee_rate_bps).toBe(0n)
    expect(payload.expiration).toBe(0n)

    const payloadDefault = buildOrderPayload({
      userAddress,
      outcome: { token_id: '1' } as any,
      side: ORDER_SIDE.BUY,
      orderType: ORDER_TYPE.MARKET,
      amount: '1',
      limitPrice: '0',
      limitShares: '0',
      feeRateBps: Number.NaN,
    })
    expect(payloadDefault.fee_rate_bps).toBe(200n)

    const payloadTrunc = buildOrderPayload({
      userAddress,
      outcome: { token_id: '1' } as any,
      side: ORDER_SIDE.BUY,
      orderType: ORDER_TYPE.MARKET,
      amount: '1',
      limitPrice: '0',
      limitShares: '0',
      feeRateBps: 150.9,
      expirationTimestamp: 123.9,
    })

    expect(payloadTrunc.fee_rate_bps).toBe(150n)
    expect(payloadTrunc.expiration).toBe(123n)
  })
})
