'use client'

import Image from 'next/image'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatCentsLabel, formatCurrency } from '@/lib/formatters'

interface SellPositionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  outcomeLabel: string
  outcomeShortLabel: string
  outcomeIconUrl?: string | null
  fallbackIconUrl?: string | null
  shares: number
  filledShares: number | null
  avgPriceCents: number | null
  receiveAmount: number | null
  onCashOut: () => void
  onEditOrder: () => void
}

export default function SellPositionModal({
  open,
  onOpenChange,
  outcomeLabel,
  outcomeShortLabel,
  outcomeIconUrl,
  fallbackIconUrl,
  shares,
  filledShares,
  avgPriceCents,
  receiveAmount,
  onCashOut,
  onEditOrder,
}: SellPositionModalProps) {
  const isMobile = useIsMobile()
  const iconUrl = outcomeIconUrl || fallbackIconUrl || ''
  const safeShares = Number.isFinite(shares) ? shares : 0
  const safeFilledShares = Number.isFinite(filledShares) ? filledShares : null
  const hasPartialFill = safeFilledShares != null
    && safeFilledShares > 0
    && safeFilledShares + 1e-6 < safeShares
  const sharesLabel = safeShares.toFixed(2)
  const filledSharesLabel = safeFilledShares != null ? safeFilledShares.toFixed(2) : sharesLabel
  const avgPriceDollars = typeof avgPriceCents === 'number' && Number.isFinite(avgPriceCents)
    ? avgPriceCents / 100
    : null
  const avgPriceLabel = formatCentsLabel(avgPriceDollars, { fallback: '—' })
  const receiveLabel = useMemo(
    () => (typeof receiveAmount === 'number' && Number.isFinite(receiveAmount)
      ? formatCurrency(receiveAmount, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '—'),
    [receiveAmount],
  )

  const body = (
    <div className="space-y-5 text-center">
      <div className="flex flex-col items-center gap-2">
        {iconUrl
          ? (
              <Image
                src={iconUrl}
                alt={outcomeLabel}
                width={64}
                height={64}
                className="size-16 rounded-md object-cover"
              />
            )
          : (
              <div className={`
                flex size-16 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground
              `}
              >
                {outcomeLabel.slice(0, 1)}
              </div>
            )}
        <div className="text-xl font-semibold text-foreground">
          Sell
          {' '}
          {outcomeLabel}
        </div>
        <div className="text-sm text-muted-foreground">
          {outcomeShortLabel}
        </div>
      </div>

      <div className="rounded-lg bg-muted/60 px-4 py-4">
        <div className="text-xs font-semibold text-foreground">
          Receive
        </div>
        <div className="mt-2 flex items-center justify-center gap-2 text-2xl font-extrabold text-yes">
          <Image
            src="/images/trade/money.svg"
            alt=""
            width={20}
            height={20}
            className="size-5"
          />
          <span>{receiveLabel}</span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Selling
          {' '}
          {hasPartialFill ? `${filledSharesLabel} of ${sharesLabel}` : sharesLabel}
          {' '}
          shares at
          {' '}
          {avgPriceLabel}
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative w-full pb-1.25">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 rounded-b-md bg-yes/70" />
          <Button
            type="button"
            className={`
              relative h-11 w-full translate-y-0 rounded-md bg-yes text-base font-bold text-white transition-transform
              duration-150 ease-out
              hover:translate-y-px hover:bg-yes-foreground
              active:translate-y-0.5
            `}
            onClick={onCashOut}
          >
            Cash out
          </Button>
        </div>
        <button
          type="button"
          className="text-sm font-semibold text-foreground"
          onClick={onEditOrder}
        >
          Edit order
        </button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] w-full border-border/70 bg-background px-4 pt-4 pb-6">
          {body}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/70 bg-background p-6">
        {body}
      </DialogContent>
    </Dialog>
  )
}
