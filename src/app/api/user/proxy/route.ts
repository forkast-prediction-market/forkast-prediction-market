import { NextResponse } from 'next/server'
import { UserRepository } from '@/lib/db/queries/user'

export async function GET() {
  const user = await UserRepository.getCurrentUser({ disableCookieCache: true })

  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  return NextResponse.json({
    proxy_wallet_address: user.proxy_wallet_address ?? null,
    proxy_wallet_signature: user.proxy_wallet_signature ?? null,
    proxy_wallet_signed_at: user.proxy_wallet_signed_at ?? null,
    proxy_wallet_status: user.proxy_wallet_status ?? null,
  })
}
