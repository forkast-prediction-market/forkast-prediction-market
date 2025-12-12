import { describe, expect, it, vi } from 'vitest'

class MockUserRejectedRequestError extends Error {
  override name = 'UserRejectedRequestError'
}

vi.mock('viem', () => ({
  UserRejectedRequestError: MockUserRejectedRequestError,
}))

const { isUserRejectedRequestError, normalizeAddress } = await import('@/lib/wallet')

describe('wallet', () => {
  describe('isUserRejectedRequestError', () => {
    it('detects viem UserRejectedRequestError instances', () => {
      expect(isUserRejectedRequestError(new MockUserRejectedRequestError('nope'))).toBe(true)
    })

    it('detects errors by name', () => {
      expect(isUserRejectedRequestError({ name: 'UserRejectedRequestError' })).toBe(true)
    })

    it('detects errors by message substring', () => {
      expect(isUserRejectedRequestError({ message: 'User rejected the request' })).toBe(true)
      expect(isUserRejectedRequestError({ message: 'USER REJECTED' })).toBe(true)
    })

    it('returns false for unrelated values', () => {
      expect(isUserRejectedRequestError(null)).toBe(false)
      expect(isUserRejectedRequestError(undefined)).toBe(false)
      expect(isUserRejectedRequestError({ name: 'OtherError' })).toBe(false)
      expect(isUserRejectedRequestError({ message: 'something else' })).toBe(false)
    })
  })

  describe('normalizeAddress', () => {
    it('returns null for non-strings', () => {
      expect(normalizeAddress(null)).toBeNull()
      expect(normalizeAddress(undefined)).toBeNull()
      expect(normalizeAddress(123 as any)).toBeNull()
    })

    it('trims and validates 0x + 40 hex chars', () => {
      const addr = '0x00000000000000000000000000000000000000aA'
      expect(normalizeAddress(`  ${addr}  `)).toBe(addr)
      expect(normalizeAddress('0x123')).toBeNull()
      expect(normalizeAddress('0xZZ00000000000000000000000000000000000000')).toBeNull()
    })
  })
})
