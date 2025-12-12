import { describe, expect, it } from 'vitest'
import { isCronAuthorized } from '@/lib/auth-cron'

describe('isCronAuthorized', () => {
  it('rejects when no secret is configured', () => {
    delete process.env.CRON_SECRET
    expect(isCronAuthorized('Bearer x', undefined)).toBe(false)
  })

  it('accepts correct bearer token', () => {
    expect(isCronAuthorized('Bearer secret', 'secret')).toBe(true)
    expect(isCronAuthorized('Bearer wrong', 'secret')).toBe(false)
  })

  it('can read secret from env', () => {
    process.env.CRON_SECRET = 'env-secret'
    expect(isCronAuthorized('Bearer env-secret')).toBe(true)
    expect(isCronAuthorized('Bearer nope')).toBe(false)
  })
})
