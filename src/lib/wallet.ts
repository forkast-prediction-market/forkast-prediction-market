import { UserRejectedRequestError } from 'viem'

export function isUserRejectedRequestError(error: unknown): boolean {
  if (error instanceof UserRejectedRequestError) {
    return true
  }

  if (typeof error === 'object' && error !== null) {
    const name = 'name' in error ? (error as { name?: string }).name : undefined
    if (name === 'UserRejectedRequestError') {
      return true
    }

    const message = 'message' in error ? (error as { message?: string }).message : undefined
    if (typeof message === 'string' && message.toLowerCase().includes('user rejected')) {
      return true
    }
  }

  return false
}

export function normalizeAddress(value?: string | null): `0x${string}` | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return /^0x[0-9a-fA-F]{40}$/.test(trimmed) ? trimmed as `0x${string}` : null
}
