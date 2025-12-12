import { afterEach, describe, expect, it, vi } from 'vitest'
import { decryptSecret, encryptSecret } from '@/lib/encryption'

describe('encryption', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('encrypts and decrypts a secret round-trip', () => {
    vi.stubEnv('USERS_ENCRYPTION_KEY', 'x'.repeat(32))

    const encrypted = encryptSecret('hello')
    expect(encrypted).toMatch(/^enc\.v1\./)
    expect(encrypted).not.toContain('hello')

    const decrypted = decryptSecret(encrypted)
    expect(decrypted).toBe('hello')
  })

  it('returns empty string for empty inputs', () => {
    vi.stubEnv('USERS_ENCRYPTION_KEY', 'x'.repeat(32))
    expect(encryptSecret('')).toBe('')
    expect(decryptSecret('')).toBe('')
    expect(decryptSecret(null)).toBe('')
    expect(decryptSecret(undefined)).toBe('')
  })

  it('passes through non-prefixed values without needing a key', () => {
    vi.stubEnv('USERS_ENCRYPTION_KEY', '')
    expect(decryptSecret('plain-text')).toBe('plain-text')
  })

  it('fails closed when decrypting with missing/invalid key', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      vi.stubEnv('USERS_ENCRYPTION_KEY', '')
      const result = decryptSecret('enc.v1.not-base64')
      expect(result).toBe('')
      expect(errorSpy).toHaveBeenCalled()
    }
    finally {
      errorSpy.mockRestore()
    }
  })

  it('throws when encrypting without a sufficiently long key', () => {
    vi.stubEnv('USERS_ENCRYPTION_KEY', 'short')
    expect(() => encryptSecret('hello')).toThrow(/USERS_ENCRYPTION_KEY/)
  })
})
