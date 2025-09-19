'use client'

import { CheckIcon, CopyIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/hooks/useClipboard'

export default function SettingsAffiliateTab() {
  const { copied, copy } = useClipboard()

  function handleCopyReferralUrl() {
    copy('https://site.com/r/xyz')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Affiliate Program
        </h1>
        <p className="mt-2 text-muted-foreground">
          Earn a percentage of trading fees by sharing your referral link.
          Invite others and receive commissions automatically on every trade.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Referral Link</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  https://site.com/r/xyz
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
              <div className="text-lg font-medium text-primary">0.5%</div>
              <div className="text-sm text-muted-foreground">Commission</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
