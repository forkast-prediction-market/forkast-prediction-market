import { describe, expect, it } from 'vitest'
import {
  calculateAffiliateCommission,
  calculatePlatformShare,
  calculateTradingFee,
  createFeeCalculationExample,
} from '@/lib/affiliate-data'

describe('affiliate fee calculations', () => {
  it('calculates trading fee and split shares', () => {
    const tradeAmount = 100
    const fee = calculateTradingFee(tradeAmount, 0.01)
    expect(fee).toBe(1)

    expect(calculateAffiliateCommission(fee, 0.4)).toBe(0.4)
    expect(calculatePlatformShare(fee, 0.6)).toBe(0.6)
  })

  it('builds a formatted example with consistent percents', () => {
    const example = createFeeCalculationExample(250, {
      tradeFeePercent: '1.00',
      affiliateSharePercent: '40.00',
      platformSharePercent: '60.00',
      tradeFeeDecimal: 0.01,
      affiliateShareDecimal: 0.4,
      platformShareDecimal: 0.6,
    })

    expect(example.tradeFeePercent).toBe('1.00')
    expect(example.affiliateSharePercent).toBe('40.00')
    expect(example.platformSharePercent).toBe('60.00')
    expect(example.tradingFee).toBe('2.50')
    expect(example.affiliateCommission).toBe('1.00')
    expect(example.platformShare).toBe('1.50')
  })
})
