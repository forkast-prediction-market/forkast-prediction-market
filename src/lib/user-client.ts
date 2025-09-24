import type { User } from '@/types'
import { isAdminWalletClient } from '@/lib/admin-client'

export function normalizeUserSettings(settings: unknown): User['settings'] {
  if (!settings) {
    return {}
  }

  if (typeof settings === 'string') {
    try {
      return JSON.parse(settings)
    }
    catch {
      return {}
    }
  }

  if (typeof settings === 'object') {
    return settings as User['settings']
  }

  return {}
}

export function buildUserFromSession(sessionUser: any): User {
  return {
    ...sessionUser,
    settings: normalizeUserSettings(sessionUser?.settings),
    isAdmin: isAdminWalletClient(sessionUser?.address) || sessionUser?.isAdmin || false,
  }
}
