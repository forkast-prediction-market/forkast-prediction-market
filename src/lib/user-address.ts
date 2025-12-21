import type { User } from '@/types'

export function getUserPrimaryAddress(user?: User | null): string {
  return user?.proxy_wallet_address ?? user?.address ?? ''
}

export function getUserPublicAddress(user?: { proxy_wallet_address?: string | null }): string {
  return typeof user?.proxy_wallet_address === 'string' ? user.proxy_wallet_address : ''
}
