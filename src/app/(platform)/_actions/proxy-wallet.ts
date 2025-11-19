'use server'

import type { ProxyWalletStatus } from '@/types'
import { eq } from 'drizzle-orm'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { getSafeProxyWalletAddress } from '@/lib/contracts/safeProxy'
import { UserRepository } from '@/lib/db/queries/user'
import { users } from '@/lib/db/schema/auth/tables'
import { db } from '@/lib/drizzle'

interface SaveProxyWalletSignatureArgs {
  signature: string
}

interface SaveProxyWalletSignatureResult {
  data: {
    proxy_wallet_address: string | null
    proxy_wallet_signature: string | null
    proxy_wallet_signed_at: string | null
    proxy_wallet_status: ProxyWalletStatus | null
  } | null
  error: string | null
}

export async function saveProxyWalletSignature({ signature }: SaveProxyWalletSignatureArgs): Promise<SaveProxyWalletSignatureResult> {
  const trimmedSignature = typeof signature === 'string' ? signature.trim() : ''

  if (!trimmedSignature || !trimmedSignature.startsWith('0x')) {
    return { data: null, error: 'Invalid signature received.' }
  }

  const currentUser = await UserRepository.getCurrentUser({ disableCookieCache: true })
  if (!currentUser) {
    return { data: null, error: 'Please sign in to continue.' }
  }

  try {
    const proxyAddress = await getSafeProxyWalletAddress(currentUser.address as `0x${string}`)

    const [updated] = await db
      .update(users)
      .set({
        proxy_wallet_signature: trimmedSignature,
        proxy_wallet_address: proxyAddress,
        proxy_wallet_signed_at: new Date(),
        proxy_wallet_status: 'signed',
      })
      .where(eq(users.id, currentUser.id))
      .returning({
        proxy_wallet_address: users.proxy_wallet_address,
        proxy_wallet_signature: users.proxy_wallet_signature,
        proxy_wallet_signed_at: users.proxy_wallet_signed_at,
        proxy_wallet_status: users.proxy_wallet_status,
      })

    if (!updated) {
      return { data: null, error: DEFAULT_ERROR_MESSAGE }
    }

    return {
      data: {
        proxy_wallet_address: updated.proxy_wallet_address,
        proxy_wallet_signature: updated.proxy_wallet_signature,
        proxy_wallet_signed_at: updated.proxy_wallet_signed_at?.toISOString() ?? null,
        proxy_wallet_status: updated.proxy_wallet_status as ProxyWalletStatus | null,
      },
      error: null,
    }
  }
  catch (error) {
    console.error('Failed to save proxy wallet signature', error)
    return { data: null, error: DEFAULT_ERROR_MESSAGE }
  }
}
