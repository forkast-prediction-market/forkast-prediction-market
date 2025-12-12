import { describe, expect, it } from 'vitest'
import { calculateWinnings, isMarketNew, sanitizeSvg } from '@/lib/utils'

describe('sanitizeSvg', () => {
  it('strips <script> blocks and inline handlers', () => {
    const input = `<svg><script>alert(1)</script><rect onclick="alert(2)"/></svg>`
    const sanitized = sanitizeSvg(input)
    expect(sanitized.toLowerCase()).not.toContain('<script')
    expect(sanitized.toLowerCase()).not.toContain('onclick=')
  })

  it('removes javascript: URLs and non-image data: URLs', () => {
    const input = `<svg><a href="javascript:alert(1)">x</a><image href="data:text/html;base64,AAAA"/></svg>`
    const sanitized = sanitizeSvg(input)
    expect(sanitized.toLowerCase()).not.toContain('javascript:')
    expect(sanitized.toLowerCase()).not.toContain('data:text/html')
  })

  it('preserves data:image URLs', () => {
    const input = `<svg><image href="data:image/png;base64,iVBORw0KGgo="/></svg>`
    const sanitized = sanitizeSvg(input)
    expect(sanitized).toContain('data:image/png;base64')
  })
})

describe('isMarketNew', () => {
  it('returns false for invalid dates', () => {
    expect(isMarketNew('not-a-date')).toBe(false)
  })

  it('uses thresholdDays and supports deterministic time', () => {
    const createdAt = new Date(0).toISOString()
    const within = 3 * 86_400_000
    const beyond = 8 * 86_400_000

    expect(isMarketNew(createdAt, 7, within)).toBe(true)
    expect(isMarketNew(createdAt, 7, beyond)).toBe(false)
  })
})

describe('calculateWinnings', () => {
  it('returns 0 for invalid inputs', () => {
    expect(calculateWinnings(10, 0)).toBe(0)
    expect(calculateWinnings(-10, 0.5)).toBe(0)
    expect(calculateWinnings(Number.NaN, 0.5)).toBe(0)
    expect(calculateWinnings(10, Number.NaN)).toBe(0)
  })

  it('computes winnings as (amount/price - amount)', () => {
    expect(calculateWinnings(10, 1)).toBe(0)
    expect(calculateWinnings(10, 0.5)).toBe(10)
  })
})
