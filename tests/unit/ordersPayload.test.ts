import { afterEach, describe, expect, it, vi } from 'vitest'
import { ORDER_SIDE, ORDER_TYPE } from '@/lib/constants'
import { ZERO_ADDRESS } from '@/lib/contracts'
import { buildOrderPayload } from '@/lib/orders'

vi.mock('@/app/(platform)/event/[slug]/_actions/store-order', () => ({
  storeOrderAction: vi.fn(),
}))

describe('buildOrderPayload money-safety defaults', () => {
  const userAddress = '0x0000000000000000000000000000000000000001' as const
  const validReferrer = '0x00000000000000000000000000000000000000aa' as const
  const validAffiliate = '0x00000000000000000000000000000000000000bb' as const

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses env fee recipient when referrer is invalid', () => {
    vi.stubEnv('NEXT_PUBLIC_FEE_RECIPIENT_WALLET', validReferrer)

    const payload = buildOrderPayload({
      userAddress,
      outcome: { token_id: '1' } as any,
      side: ORDER_SIDE.BUY,
      orderType: ORDER_TYPE.MARKET,
      amount: '1',
      limitPrice: '0',
      limitShares: '0',
      referrerAddress: 'not-an-address' as any,
    })

    expect(payload.referrer).toBe(validReferrer)
  })

  it('sets affiliate_percentage only when affiliate is valid and non-zero', () => {
    const payloadInvalidAffiliate = buildOrderPayload({
      userAddress,
      outcome: { token_id: '1' } as any,
      side: ORDER_SIDE.BUY,
      orderType: ORDER_TYPE.MARKET,
      amount: '1',
      limitPrice: '0',
      limitShares: '0',
      affiliateAddress: 'bad' as any,
      affiliateSharePercent: 40,
    })
    expect(payloadInvalidAffiliate.affiliate).toBe(ZERO_ADDRESS)
    expect(payloadInvalidAffiliate.affiliate_percentage).toBe(0n)

    const payloadZeroAffiliate = buildOrderPayload({
      userAddress,
      outcome: { token_id: '1' } as any,
      side: ORDER_SIDE.BUY,
      orderType: ORDER_TYPE.MARKET,
      amount: '1',
      limitPrice: '0',
      limitShares: '0',
      affiliateAddress: ZERO_ADDRESS,
      affiliateSharePercent: 40,
    })
    expect(payloadZeroAffiliate.affiliate).toBe(ZERO_ADDRESS)
    expect(payloadZeroAffiliate.affiliate_percentage).toBe(0n)

    const payloadValidAffiliate = buildOrderPayload({
      userAddress,
      outcome: { token_id: '1' } as any,
      side: ORDER_SIDE.BUY,
      orderType: ORDER_TYPE.MARKET,
      amount: '1',
      limitPrice: '0',
      limitShares: '0',
      affiliateAddress: validAffiliate,
      affiliateSharePercent: 40.9,
    })
    expect(payloadValidAffiliate.affiliate).toBe(validAffiliate)
    expect(payloadValidAffiliate.affiliate_percentage).toBe(40n)
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
