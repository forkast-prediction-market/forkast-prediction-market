import type { User } from '@/types'
import { describe, expect, it } from 'vitest'
import { getUserPrimaryAddress } from '@/lib/user-address'

describe('getUserPrimaryAddress', () => {
  it('prefers proxy wallet when available', () => {
    const user: Partial<User> = {
      address: '0xMAIN',
      proxy_wallet_address: '0xPROXY',
    }

    expect(getUserPrimaryAddress(user as User)).toBe('0xPROXY')
  })

  it('falls back to main address when no proxy', () => {
    const user: Partial<User> = {
      address: '0xMAIN',
      proxy_wallet_address: null,
    }

    expect(getUserPrimaryAddress(user as User)).toBe('0xMAIN')
  })

  it('returns empty string when user is missing', () => {
    expect(getUserPrimaryAddress(null)).toBe('')
    expect(getUserPrimaryAddress(undefined)).toBe('')
  })
})
