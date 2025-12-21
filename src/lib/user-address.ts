import type { User } from '@/types'

export function getUserPublicAddress(user?: User | null): string {
  return typeof user?.proxy_wallet_address === 'string' ? user.proxy_wallet_address : ''
}
