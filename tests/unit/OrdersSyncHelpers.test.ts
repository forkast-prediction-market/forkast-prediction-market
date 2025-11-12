import { describe, expect, it } from 'vitest'
import {
  convertSizeMatchedToMicro,
  DEFAULT_ORDER_SYNC_LIMIT,
  evaluateOrderSyncDecision,
  hasReachedTimeLimit,
  MAX_ORDER_SYNC_LIMIT,
  parseLimitParam,
} from '@/app/api/sync/orders/helpers'
import { isCronAuthorized } from '@/lib/auth-cron'

describe('orders sync helpers', () => {
  it('parses limit with defaults and clamps to max', () => {
    expect(parseLimitParam(null)).toBe(DEFAULT_ORDER_SYNC_LIMIT)
    expect(parseLimitParam('42')).toBe(42)
    expect(parseLimitParam('600')).toBe(MAX_ORDER_SYNC_LIMIT)
    expect(parseLimitParam('-5')).toBe(DEFAULT_ORDER_SYNC_LIMIT)
    expect(parseLimitParam('abc')).toBe(DEFAULT_ORDER_SYNC_LIMIT)
  })

  it('validates cron authorization header', () => {
    expect(isCronAuthorized(null, 'secret')).toBe(false)
    expect(isCronAuthorized('Bearer nope', 'secret')).toBe(false)
    expect(isCronAuthorized('Bearer secret', 'secret')).toBe(true)
    expect(isCronAuthorized('Bearer secret', undefined)).toBe(false)
  })

  it('detects when time limit has been reached', () => {
    const started = 1000
    expect(hasReachedTimeLimit(started, started + 100)).toBe(false)
    expect(hasReachedTimeLimit(started, started + 250_000)).toBe(true)
    expect(hasReachedTimeLimit(started, started + 300_000)).toBe(true)
  })

  it('converts size matched decimals to micro strings', () => {
    expect(convertSizeMatchedToMicro('12.345678')).toBe('12345678')
    expect(convertSizeMatchedToMicro('0.000001')).toBe('1')
    expect(convertSizeMatchedToMicro('abc')).toBe('0')
  })

  it('skips live remote orders when evaluating decisions', () => {
    const decision = evaluateOrderSyncDecision({ id: '1', status: 'live', sizeMatched: '0' }, '0')
    expect(decision).toEqual({ type: 'skip_live' })
  })

  it('returns update payloads with converted size when needed', () => {
    const decision = evaluateOrderSyncDecision({ id: '2', status: 'matched', sizeMatched: '1.5' }, '1000000')
    expect(decision).toEqual({
      type: 'update',
      payload: {
        status: 'matched',
        size_matched: '1500000',
      },
    })
  })

  it('omits size updates when the converted value matches local state', () => {
    const decision = evaluateOrderSyncDecision({ id: '3', status: 'matched', sizeMatched: '1.0' }, '1000000')
    expect(decision).toEqual({
      type: 'update',
      payload: {
        status: 'matched',
      },
    })
  })
})
