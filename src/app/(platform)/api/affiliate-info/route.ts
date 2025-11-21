'use server'

import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE, ZERO_ADDRESS } from '@/lib/constants'
import { SettingsRepository } from '@/lib/db/queries/settings'
import { UserRepository } from '@/lib/db/queries/user'

function getFeeRecipientAddress() {
  const address = process.env.NEXT_PUBLIC_FEE_RECIPIENT_WALLET!
  return typeof address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(address)
    ? address
    : ZERO_ADDRESS
}

export async function GET() {
  try {
    const referrerAddress = getFeeRecipientAddress()
    const { data: settings } = await SettingsRepository.getSettings()
    const affiliateSettings = settings?.affiliate

    const tradeFeeBps = (() => {
      const raw = affiliateSettings?.trade_fee_bps?.value
      const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed
      }
      return 100
    })()

    const user = await UserRepository.getCurrentUser()

    if (!user) {
      return NextResponse.json({
        referrerAddress,
        affiliateAddress: ZERO_ADDRESS,
        affiliateSharePercent: 0,
        tradeFeeBps,
      })
    }

    let affiliateAddress = ZERO_ADDRESS
    let affiliateSharePercent = 0

    if (user.referred_by_user_id) {
      const { data: affiliateUsers } = await UserRepository.getUsersByIds([user.referred_by_user_id])
      const affiliateUser = affiliateUsers?.[0]

      if (affiliateUser?.address && /^0x[0-9a-fA-F]{40}$/.test(affiliateUser.address)) {
        affiliateAddress = affiliateUser.address as `0x${string}`
        const shareBps = affiliateSettings?.affiliate_share_bps?.value

        if (shareBps) {
          const parsed = Number.parseInt(shareBps, 10)
          if (Number.isFinite(parsed) && parsed > 0) {
            affiliateSharePercent = Math.round(parsed / 100)
          }
        }
      }
    }

    return NextResponse.json({
      referrerAddress,
      affiliateAddress,
      affiliateSharePercent,
      tradeFeeBps,
    })
  }
  catch (error) {
    console.error('Failed to load affiliate info', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
