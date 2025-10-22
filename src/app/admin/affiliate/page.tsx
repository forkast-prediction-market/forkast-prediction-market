import AdminAffiliateOverview from '@/app/admin/_components/AdminAffiliateOverview'
import AdminAffiliateSettingsForm from '@/app/admin/_components/AdminAffiliateSettingsForm'
import { AffiliateRepository } from '@/lib/db/queries/affiliate'
import { SettingsRepository } from '@/lib/db/queries/settings'
import { getSupabaseImageUrl } from '@/lib/supabase'

interface AffiliateOverviewRow {
  affiliate_user_id: string
  total_referrals: number | null
  total_volume: number | null
  total_affiliate_fees: number | null
}

interface AffiliateProfile {
  id: string
  username?: string | null
  address: string
  image?: string | null
  affiliate_code?: string | null
}

interface RowSummary {
  id: string
  username?: string | null
  address: string
  image: string
  affiliate_code: string | null
  total_referrals: number
  total_volume: number
  total_affiliate_fees: number
}

export default async function AdminSettingsPage() {
  const { data: allSettings } = await SettingsRepository.getSettings()
  const affiliateSettings = allSettings?.affiliate
  const { data: overviewData } = await AffiliateRepository.listAffiliateOverview()

  const overview = (overviewData ?? []) as AffiliateOverviewRow[]
  const userIds = overview.map(row => row.affiliate_user_id)
  const { data: profilesData } = await AffiliateRepository.getAffiliateProfiles(userIds)
  const profiles = (profilesData ?? []) as AffiliateProfile[]

  let updatedAtLabel: string | undefined
  const tradeFeeUpdatedAt = affiliateSettings?.trade_fee_bps?.updated_at
  const shareUpdatedAt = affiliateSettings?.affiliate_share_bps?.updated_at
  const latestUpdatedAt
    = tradeFeeUpdatedAt && shareUpdatedAt
      ? new Date(tradeFeeUpdatedAt) > new Date(shareUpdatedAt)
        ? tradeFeeUpdatedAt
        : shareUpdatedAt
      : tradeFeeUpdatedAt || shareUpdatedAt

  if (latestUpdatedAt) {
    const date = new Date(latestUpdatedAt)
    if (!Number.isNaN(date.getTime())) {
      const iso = date.toISOString()
      updatedAtLabel = `${iso.replace('T', ' ').slice(0, 19)} UTC`
    }
  }

  const profileMap = new Map<string, AffiliateProfile>(profiles.map(profile => [profile.id, profile]))

  const fallbackAddress = '0x0000000000000000000000000000000000000000'

  const rows: RowSummary[] = overview.map((item) => {
    const profile = profileMap.get(item.affiliate_user_id)

    return {
      id: item.affiliate_user_id,
      username: profile?.username ?? undefined,
      address: profile?.address ?? fallbackAddress,
      image: profile?.image ? getSupabaseImageUrl(profile.image) : `https://avatar.vercel.sh/${profile?.address || item.affiliate_user_id}.png`,
      affiliate_code: profile?.affiliate_code ?? null,
      total_referrals: Number(item.total_referrals ?? 0),
      total_volume: Number(item.total_volume ?? 0),
      total_affiliate_fees: Number(item.total_affiliate_fees ?? 0),
    }
  })

  const aggregate = rows.reduce<{ totalVolume: number, totalAffiliateFees: number, totalReferrals: number }>((acc, row) => {
    acc.totalVolume += row.total_volume
    acc.totalAffiliateFees += row.total_affiliate_fees
    acc.totalReferrals += row.total_referrals
    return acc
  }, { totalVolume: 0, totalAffiliateFees: 0, totalReferrals: 0 })

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <>
      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <AdminAffiliateSettingsForm
          tradeFeeBps={Number.parseInt(affiliateSettings?.trade_fee_bps?.value || '100', 10)}
          affiliateShareBps={Number.parseInt(affiliateSettings?.affiliate_share_bps?.value || '5000', 10)}
          updatedAtLabel={updatedAtLabel}
        />
        <div className="grid gap-4 rounded-lg border p-6">
          <div>
            <h2 className="text-xl font-semibold">Totals</h2>
            <p className="text-sm text-muted-foreground">
              Consolidated affiliate performance across your platform.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground uppercase">Total referrals</p>
              <p className="mt-1 text-2xl font-semibold">{aggregate.totalReferrals}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground uppercase">Volume</p>
              <p className="mt-1 text-2xl font-semibold">
                {currencyFormatter.format(aggregate.totalVolume)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground uppercase">Affiliate fees</p>
              <p className="mt-1 text-2xl font-semibold">
                {currencyFormatter.format(aggregate.totalAffiliateFees)}
              </p>
            </div>
          </div>
        </div>
      </section>
      <AdminAffiliateOverview rows={rows} />
    </>
  )
}
