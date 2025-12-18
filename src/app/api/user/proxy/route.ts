import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { UserRepository } from '@/lib/db/queries/user'
import { users } from '@/lib/db/schema/auth/tables'
import { db } from '@/lib/drizzle'
import { isProxyWalletDeployed } from '@/lib/safe-proxy'

export async function GET() {
  const user = await UserRepository.getCurrentUser({ disableCookieCache: true })

  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const proxyWalletAddress = user.proxy_wallet_address ?? null
  let proxyWalletStatus = user.proxy_wallet_status ?? null

  if (proxyWalletAddress) {
    const deployed = await isProxyWalletDeployed(proxyWalletAddress as `0x${string}`)
    if (deployed && proxyWalletStatus !== 'deployed') {
      await db
        .update(users)
        .set({ proxy_wallet_status: 'deployed', proxy_wallet_tx_hash: null })
        .where(eq(users.id, user.id))
      proxyWalletStatus = 'deployed'
    }
    else if (!deployed && proxyWalletStatus === 'deployed') {
      await db
        .update(users)
        .set({ proxy_wallet_status: 'deploying' })
        .where(eq(users.id, user.id))
      proxyWalletStatus = 'deploying'
    }
  }

  return NextResponse.json({
    proxy_wallet_address: proxyWalletAddress,
    proxy_wallet_signature: user.proxy_wallet_signature ?? null,
    proxy_wallet_signed_at: user.proxy_wallet_signed_at ?? null,
    proxy_wallet_status: proxyWalletStatus,
    proxy_wallet_tx_hash: user.proxy_wallet_tx_hash ?? null,
  })
}
