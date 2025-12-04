import type { User } from '@/types'

export function getUserPrimaryAddress(user?: User | null): string {
  return user?.proxy_wallet_address ?? user?.address ?? ''
}
