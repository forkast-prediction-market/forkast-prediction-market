'use client'

import { CheckIcon, CopyIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/hooks/useClipboard'
import { truncateAddress } from '@/lib/utils'

interface ReferralSummary {
  user_id: string
  username?: string | null
  address: string
  attributed_at: string
}

interface Props {
  referralUrl: string
  commissionPercent: number
  tradeFeePercent: number
  affiliateSharePercent: number
  stats: {
    total_referrals: number
    active_referrals: number
    total_volume: number
    total_affiliate_fees: number
  }
  recentReferrals: ReferralSummary[]
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

export default function SettingsAffiliateTab({
  referralUrl,
  commissionPercent,
  tradeFeePercent,
  affiliateSharePercent,
  stats,
  recentReferrals,
}: Props) {
  const { copied, copy } = useClipboard()

  function handleCopyReferralUrl() {
    copy(referralUrl)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Affiliate Program</h1>
        <p className="mt-2 text-muted-foreground">
          Share your referral link to earn a percentage of every trade executed by users you onboard.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Referral link</h3>
              <div className="flex items-center gap-2">
                <span className="truncate text-sm text-muted-foreground" title={referralUrl}>
                  {referralUrl}
                </span>
                <Button
                  variant="ghost"
                  type="button"
                  size="sm"
                  onClick={handleCopyReferralUrl}
                  className="h-auto p-1"
                  title={copied ? 'Copied!' : 'Copy referral link'}
                >
                  {copied ? <CheckIcon className="size-4 text-yes" /> : <CopyIcon className="size-4" />}
                </Button>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-medium text-primary">{formatPercent(commissionPercent)}</div>
              <div className="text-sm text-muted-foreground">Commission on volume</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <div className="grid gap-1 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Base trading fee</span>
              <span className="font-medium text-foreground">{formatPercent(tradeFeePercent)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Affiliate share of fee</span>
              <span className="font-medium text-foreground">{formatPercent(affiliateSharePercent)}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Your commission equals the trading fee multiplied by the affiliate share setting.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase">Total referrals</p>
          <p className="mt-2 text-2xl font-semibold">{stats.total_referrals}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase">Active traders</p>
          <p className="mt-2 text-2xl font-semibold">{stats.active_referrals}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase">Referred volume</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(Number(stats.total_volume ?? 0))}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase">Earned fees</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(Number(stats.total_affiliate_fees ?? 0))}</p>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-medium">Recent referrals</h3>
            <p className="text-sm text-muted-foreground">Latest users who joined through your link.</p>
          </div>
          <Link href="/settings?tab=affiliate" className="text-sm text-muted-foreground" prefetch={false}>
            Refresh
          </Link>
        </div>
        <div className="divide-y">
          {recentReferrals.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No referrals yet. Share your link to get started.
            </div>
          )}
          {recentReferrals.map(referral => (
            <div key={referral.user_id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium">
                  {referral.username || truncateAddress(referral.address)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Joined
                  {' '}
                  {new Date(referral.attributed_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
