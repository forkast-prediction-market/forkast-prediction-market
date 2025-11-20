import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { isProxyWalletDeployed } from '@/lib/contracts/safeProxy'
import { UserRepository } from '@/lib/db/queries/user'
import { users } from '@/lib/db/schema/auth/tables'
import { db } from '@/lib/drizzle'

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
        .set({ proxy_wallet_status: 'deployed' })
        .where(eq(users.id, user.id))
      proxyWalletStatus = 'deployed'
    }
  }

  return NextResponse.json({
    proxy_wallet_address: proxyWalletAddress,
    proxy_wallet_signature: user.proxy_wallet_signature ?? null,
    proxy_wallet_signed_at: user.proxy_wallet_signed_at ?? null,
    proxy_wallet_status: proxyWalletStatus,
  })
}
