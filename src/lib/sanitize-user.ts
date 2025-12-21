import type { User } from '@/types'
import { getUserPublicAddress } from '@/lib/user-address'

export function sanitizeUserForClient(user: User | null): User | null {
  if (!user) {
    return null
  }

  const publicAddress = getUserPublicAddress(user)
  const { name: _omitName, ...rest } = user as Record<string, any>

  return {
    ...rest,
    address: publicAddress,
    proxy_wallet_address: user.proxy_wallet_address ?? null,
  }
}
