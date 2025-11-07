'use client'

import type { AffiliateWidgetEvent } from '@/lib/affiliate-widget'
import type { AffiliateData } from '@/types'
import { CheckIcon, CopyIcon, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import AffiliateWidget from '@/components/affiliate/AffiliateWidget'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useClipboard } from '@/hooks/useClipboard'
import { formatCurrency, formatPercent, truncateAddress } from '@/lib/utils'

interface SettingsAffiliateContentProps {
  affiliateData?: AffiliateData
  affiliateCode?: string
  widgetConfig?: {
    events: AffiliateWidgetEvent[]
    categories: { label: string, value: string }[]
    siteName: string
    baseUrl: string
    logoSvg?: string
  }
}

type WidgetTheme = 'auto' | 'light' | 'dark'

export default function SettingsAffiliateContent({ affiliateData, affiliateCode, widgetConfig }: SettingsAffiliateContentProps) {
  const referralClipboard = useClipboard()
  const embedClipboard = useClipboard()
  const [selectedCategory, setSelectedCategory] = useState(() => widgetConfig?.categories[0]?.value ?? 'new')
  const [theme, setTheme] = useState<WidgetTheme>('auto')
  const [widgetEvents, setWidgetEvents] = useState<AffiliateWidgetEvent[]>(widgetConfig?.events ?? [])
  const [isLoadingWidget, setIsLoadingWidget] = useState(false)
  const [widgetError, setWidgetError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  function handleCopyReferralUrl() {
    if (affiliateData?.referralUrl) {
      referralClipboard.copy(affiliateData.referralUrl)
    }
  }

  useEffect(() => () => abortControllerRef.current?.abort(), [])

  useEffect(() => {
    setWidgetEvents(widgetConfig?.events ?? [])
    if (widgetConfig?.categories?.length) {
      const availableValues = widgetConfig.categories.map(option => option.value)
      if (!availableValues.includes(selectedCategory)) {
        setSelectedCategory(widgetConfig.categories[0].value)
      }
    }
  }, [widgetConfig, selectedCategory])

  const embedUrl = useMemo(() => {
    if (!widgetConfig || !affiliateCode) {
      return ''
    }

    const params = new URLSearchParams({
      affiliate: affiliateCode,
      category: selectedCategory,
      theme,
    })

    const normalizedBase = widgetConfig.baseUrl.replace(/\/$/, '')
    return `${normalizedBase}/embed/affiliate-widget?${params.toString()}`
  }, [affiliateCode, selectedCategory, theme, widgetConfig])

  const iframeCode = useMemo(() => {
    if (!embedUrl) {
      return ''
    }

    return `<iframe src="${embedUrl}" title="${widgetConfig?.siteName ?? 'Affiliate widget'}" loading="lazy" style="border:0;width:100%;max-width:440px;height:640px;border-radius:32px;overflow:hidden;" allowfullscreen></iframe>`
  }, [embedUrl, widgetConfig?.siteName])

  function handleCopyEmbedCode() {
    if (!iframeCode) {
      return
    }
    embedClipboard.copy(iframeCode)
  }

  async function loadWidgetEvents(category: string) {
    if (!widgetConfig) {
      return
    }

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoadingWidget(true)
    setWidgetError(null)

    try {
      const response = await fetch(`/api/affiliate/widget-events?category=${encodeURIComponent(category)}`, {
        signal: controller.signal,
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Failed to load widget events')
      }

      const payload = await response.json() as { events?: AffiliateWidgetEvent[] }
      setWidgetEvents(payload.events ?? [])
    }
    catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        return
      }
      console.error('Unable to load widget events for affiliate preview.', error)
      setWidgetError('Unable to load events for this category. Please try again later.')
    }
    finally {
      if (!controller.signal.aborted) {
        setIsLoadingWidget(false)
      }
    }
  }

  function handleCategoryChange(value: string) {
    setSelectedCategory(value)
    loadWidgetEvents(value)
  }

  if (!affiliateData) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        Unable to load affiliate information. Please try again later.
      </div>
    )
  }

  return (
    <div className="grid gap-8">
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
                title={referralClipboard.copied ? 'Copied!' : 'Copy referral link'}
              >
                {referralClipboard.copied ? <CheckIcon className="size-4 text-yes" /> : <CopyIcon className="size-4" />}
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

      {affiliateCode && widgetConfig && (
        <div className="rounded-lg border p-4 sm:p-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Promo widget</h3>
            <p className="text-sm text-muted-foreground">
              Share this mini widget anywhere. It follows the visitor’s theme preference and keeps your affiliate code on every click.
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Main category</p>
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {widgetConfig.categories.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Theme</p>
                  <Select value={theme} onValueChange={value => setTheme(value as WidgetTheme)}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (match browser)</SelectItem>
                      <SelectItem value="light">Always light</SelectItem>
                      <SelectItem value="dark">Always dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {widgetError && (
                <p className="text-sm text-destructive">{widgetError}</p>
              )}

              <div className="relative">
                {isLoadingWidget && (
                  <div className={`
                    absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-background/80 backdrop-blur-sm
                  `}
                  >
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                )}
                <AffiliateWidget
                  events={widgetEvents}
                  affiliateCode={affiliateCode}
                  baseUrl={widgetConfig.baseUrl}
                  siteName={widgetConfig.siteName}
                  logoSvg={widgetConfig.logoSvg}
                  theme={theme}
                  className="min-h-[28rem]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-3xl border bg-muted/40 p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Widget code</p>
                <Textarea
                  value={iframeCode}
                  readOnly
                  rows={10}
                  className="font-mono text-xs"
                />
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={handleCopyEmbedCode} disabled={!iframeCode}>
                    {embedClipboard.copied
                      ? <CheckIcon className="mr-2 size-4 text-yes" />
                      : (
                          <CopyIcon className="mr-2 size-4" />
                        )}
                    {embedClipboard.copied ? 'Copied' : 'Copy code'}
                  </Button>
                </div>
              </div>
              <div className={`
                rounded-2xl border border-dashed border-muted-foreground/40 bg-background/60 p-4 text-xs leading-relaxed
                text-muted-foreground
              `}
              >
                <p>
                  Hand this iframe to your partners—the link already routes through your affiliate path, so each visit is credited to you.
                </p>
                <p className="mt-2">
                  Want a different theme or category? Tweak the options above and copy the snippet again.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  {new Date(referral.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
