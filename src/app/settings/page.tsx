import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import SettingsContent from '@/app/settings/_components/SettingsContent'
import { AffiliateModel } from '@/lib/db/affiliates'
import { UserModel } from '@/lib/db/users'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function SettingsPage({ searchParams }: PageProps<'/settings'>) {
  const user = await UserModel.getCurrentUser()
  const params = await searchParams
  const tab = (params.tab as string) ?? 'profile'

  if (!user) {
    redirect('/')
  }

  const affiliateCode = user.affiliate_code
    ?? (await AffiliateModel.ensureUserAffiliateCode(user.id)).data

  const { data: forkSettings } = await AffiliateModel.getForkSettings()
  const { data: statsData } = await AffiliateModel.getUserAffiliateStats(user.id)
  const { data: referralsData } = await AffiliateModel.listReferralsByAffiliate(user.id)

  const tradeFeePercent = (forkSettings?.trade_fee_bps ?? 100) / 100
  const affiliateSharePercent = (forkSettings?.affiliate_share_bps ?? 5000) / 100
  const commissionPercent = Number(((forkSettings?.trade_fee_bps ?? 100) / 100) * ((forkSettings?.affiliate_share_bps ?? 5000) / 10000))

  function resolveBaseUrl() {
    const raw = process.env.NEXT_PUBLIC_SITE_URL!

    return raw.startsWith('http') ? raw : `https://${raw}`
  }

  const affiliateData = affiliateCode
    ? {
        referralUrl: `${resolveBaseUrl()}/r/${affiliateCode}`,
        commissionPercent,
        tradeFeePercent,
        affiliateSharePercent,
        stats: {
          total_referrals: Number(statsData?.total_referrals ?? 0),
          active_referrals: Number(statsData?.active_referrals ?? 0),
          total_volume: Number(statsData?.total_volume ?? 0),
          total_affiliate_fees: Number(statsData?.total_affiliate_fees ?? 0),
        },
        recentReferrals: (referralsData ?? []).map((referral: any) => {
          const userInfo = Array.isArray(referral.users) ? referral.users[0] : referral.users

          return {
            user_id: referral.user_id as string,
            username: userInfo?.username as string | undefined,
            address: (userInfo?.address as string | undefined) ?? referral.user_id as string,
            attributed_at: referral.attributed_at as string,
          }
        }),
      }
    : undefined

  return <SettingsContent user={user} tab={tab} affiliateData={affiliateData} />
}
