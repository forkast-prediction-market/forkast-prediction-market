import type { User } from '@/types'
import { getUserPublicAddress } from '@/lib/user-address'

export function sanitizeUserForClient(user: User | null): User | null {
  if (!user) {
    return null
  }

  const publicAddress = getUserPublicAddress(user)

  const sanitized: User = {
    ...user,
    address: publicAddress,
    proxy_wallet_address: user.proxy_wallet_address ?? null,
  }

  delete (sanitized as any).name

  return sanitized
}
