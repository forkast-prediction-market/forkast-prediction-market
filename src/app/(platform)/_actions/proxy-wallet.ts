'use server'

import type { ProxyWalletStatus } from '@/types'
import { eq } from 'drizzle-orm'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { getSafeProxyWalletAddress, isProxyWalletDeployed, SAFE_PROXY_CREATE_PROXY_MESSAGE } from '@/lib/contracts/safeProxy'
import { UserRepository } from '@/lib/db/queries/user'
import { users } from '@/lib/db/schema/auth/tables'
import { db } from '@/lib/drizzle'
import { buildClobHmacSignature } from '@/lib/hmac'

interface SaveProxyWalletSignatureArgs {
  signature: string
}

interface SaveProxyWalletSignatureResult {
  data: {
    proxy_wallet_address: string | null
    proxy_wallet_signature: string | null
    proxy_wallet_signed_at: string | null
    proxy_wallet_status: ProxyWalletStatus | null
    proxy_wallet_tx_hash: string | null
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
    const proxyIsDeployed = await isProxyWalletDeployed(proxyAddress)

    let txHash: string | null = null
    if (!proxyIsDeployed) {
      txHash = await triggerSafeProxyDeployment({
        owner: currentUser.address,
        signature: trimmedSignature,
      })
    }

    const [updated] = await db
      .update(users)
      .set({
        proxy_wallet_signature: trimmedSignature,
        proxy_wallet_address: proxyAddress,
        proxy_wallet_signed_at: new Date(),
        proxy_wallet_status: proxyIsDeployed ? 'deployed' : 'signed',
        proxy_wallet_tx_hash: proxyIsDeployed ? users.proxy_wallet_tx_hash : txHash,
      })
      .where(eq(users.id, currentUser.id))
      .returning({
        proxy_wallet_address: users.proxy_wallet_address,
        proxy_wallet_signature: users.proxy_wallet_signature,
        proxy_wallet_signed_at: users.proxy_wallet_signed_at,
        proxy_wallet_status: users.proxy_wallet_status,
        proxy_wallet_tx_hash: users.proxy_wallet_tx_hash,
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
        proxy_wallet_tx_hash: updated.proxy_wallet_tx_hash,
      },
      error: null,
    }
  }
  catch (error) {
    console.error('Failed to save proxy wallet signature', error)
    const message = error instanceof Error && error.message ? error.message : DEFAULT_ERROR_MESSAGE
    return { data: null, error: message }
  }
}

async function triggerSafeProxyDeployment({ owner, signature }: { owner: string, signature: string }) {
  const clobUrl = process.env.CLOB_URL!
  const method = 'POST'
  const path = '/wallet/safe'

  const payload = {
    owner,
    paymentToken: SAFE_PROXY_CREATE_PROXY_MESSAGE.paymentToken,
    payment: SAFE_PROXY_CREATE_PROXY_MESSAGE.payment.toString(),
    paymentReceiver: SAFE_PROXY_CREATE_PROXY_MESSAGE.paymentReceiver,
    signature,
  }

  const body = JSON.stringify(payload)
  const timestamp = Math.floor(Date.now() / 1000)
  const hmacSignature = buildClobHmacSignature(
    process.env.FORKAST_API_SECRET!,
    timestamp,
    method,
    path,
    body,
  )

  const response = await fetch(`${clobUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'FORKAST_ADDRESS': process.env.FORKAST_ADDRESS!,
      'FORKAST_API_KEY': process.env.FORKAST_API_KEY!,
      'FORKAST_PASSPHRASE': process.env.FORKAST_PASSPHRASE!,
      'FORKAST_TIMESTAMP': timestamp.toString(),
      'FORKAST_SIGNATURE': hmacSignature,
    },
    body,
    signal: AbortSignal.timeout(15000),
  })

  let json: any = null
  try {
    json = await response.json()
  }
  catch {
    json = null
  }

  if (!response.ok) {
    const message = typeof json?.error === 'string'
      ? json.error
      : typeof json?.message === 'string'
        ? json.message
        : DEFAULT_ERROR_MESSAGE
    throw new Error(message)
  }

  const txHash = typeof json?.txHash === 'string' ? json.txHash : null
  return txHash
}
