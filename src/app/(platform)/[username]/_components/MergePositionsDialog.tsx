'use client'

import { CheckIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export interface MergeableMarket {
  conditionId: string
  eventSlug: string
  title: string
  icon?: string
  mergeAmount: number
  outcomeAssets: [string, string]
}

interface MergePositionsDialogProps {
  open: boolean
  markets: MergeableMarket[]
  isProcessing: boolean
  mergeCount: number
  isSuccess: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function MergePositionsDialog({
  open,
  markets,
  isProcessing,
  mergeCount,
  isSuccess,
  onOpenChange,
  onConfirm,
}: MergePositionsDialogProps) {
  function formatMergeValue(value: number) {
    const safeValue = Number.isFinite(value) ? value : 0
    return formatCurrency(safeValue)
  }
  const totalValue = markets.reduce((total, market) => total + (market.mergeAmount || 0), 0)
  const totalCount = markets.length
  const progressCount = mergeCount > 0 ? mergeCount : 0
  const actionLabel = isSuccess
    ? 'Done'
    : (isProcessing && totalCount > 0
        ? `Processing... ${progressCount}/${totalCount}`
        : 'Merge positions')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg space-y-4 sm:space-y-6">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-center text-2xl font-bold">
            Merge
            {' '}
            {formatMergeValue(totalValue || 0)}
            {' '}
            in positions
          </DialogTitle>
          <DialogDescription className="text-center">
            This will merge all eligible market positions.
          </DialogDescription>
        </DialogHeader>

        {isSuccess
          ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="grid size-16 place-items-center rounded-full bg-yes">
                  <CheckIcon className="size-8 text-white" />
                </div>
                <p className="text-sm text-muted-foreground">
                  You successfully merged all your eligible positions.
                </p>
              </div>
            )
          : (
              <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                {markets.map(market => (
                  <Link
                    key={market.conditionId}
                    href={`/event/${market.eventSlug}`}
                    className={cn(
                      'flex items-start gap-3 rounded-lg p-3 transition-colors',
                      'hover:bg-muted/60',
                    )}
                  >
                    <div className="relative size-10 overflow-hidden rounded-md bg-muted sm:size-12">
                      {market.icon
                        ? (
                            <Image
                              src={`https://gateway.irys.xyz/${market.icon}`}
                              alt={`${market.title} icon`}
                              fill
                              className="object-cover"
                            />
                          )
                        : (
                            <div className="grid size-full place-items-center text-xs text-muted-foreground">
                              No image
                            </div>
                          )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-sm leading-tight font-semibold text-foreground">
                        {market.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Value
                        {' '}
                        {formatMergeValue(market.mergeAmount || 0)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

        <DialogFooter>
          <Button
            size="outcome"
            className="w-full text-base font-bold"
            disabled={!isSuccess && (isProcessing || markets.length === 0)}
            onClick={isSuccess ? () => onOpenChange(false) : onConfirm}
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
