'use client'

import type { AffiliateData } from '@/types'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/hooks/useClipboard'
import { formatCurrency, formatPercent, truncateAddress } from '@/lib/utils'

interface SettingsAffiliateTabProps {
  affiliateData: AffiliateData
}

export default function SettingsAffiliateTab({ affiliateData }: SettingsAffiliateTabProps) {
  const { copied, copy } = useClipboard()

  function handleCopyReferralUrl() {
    copy(affiliateData.referralUrl)
  }

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Affiliate Program</h1>
        <p className="mt-2 text-muted-foreground">
          Share your referral link to earn a percentage of every trade from users you invite.
        </p>
      </div>

      <div className="rounded-lg border p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-lg font-medium">Referral link</h3>
            <div className="flex items-center gap-2">
              <span className="min-w-0 truncate text-sm text-muted-foreground" title={affiliateData.referralUrl}>
                {affiliateData.referralUrl}
              </span>
              <Button
                variant="ghost"
                type="button"
                size="icon"
                onClick={handleCopyReferralUrl}
                className="shrink-0"
                title={copied ? 'Copied!' : 'Copy referral link'}
              >
                {copied ? <CheckIcon className="size-4 text-yes" /> : <CopyIcon className="size-4" />}
              </Button>
            </div>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <div className="text-lg font-medium text-primary">{formatPercent(affiliateData.commissionPercent)}</div>
            <div className="text-sm text-muted-foreground">Commission</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase">Total referrals</p>
          <p className="mt-2 text-2xl font-semibold">{affiliateData.stats.total_referrals}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase">Active traders</p>
          <p className="mt-2 text-2xl font-semibold">{affiliateData.stats.active_referrals}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase">Referred volume</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(Number(affiliateData.stats.total_volume ?? 0))}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase">Earned fees</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(Number(affiliateData.stats.total_affiliate_fees ?? 0))}</p>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-4 py-4 sm:px-6">
          <h3 className="text-lg font-medium">Recent referrals</h3>
          <p className="text-sm text-muted-foreground">Latest users who joined through your link.</p>
        </div>
        <div className="divide-y">
          {affiliateData.recentReferrals.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-6">
              No referrals yet. Share your link to get started.
            </div>
          )}
          {affiliateData.recentReferrals.map(referral => (
            <div key={referral.user_id} className="flex items-center justify-between px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
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
