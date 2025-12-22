'use client'

import { ExternalLinkIcon } from 'lucide-react'
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
  displayValue: number
}

interface MergePositionsDialogProps {
  open: boolean
  markets: MergeableMarket[]
  isProcessing: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function MergePositionsDialog({
  open,
  markets,
  isProcessing,
  onOpenChange,
  onConfirm,
}: MergePositionsDialogProps) {
  const totalValue = markets.reduce((total, market) => total + (market.displayValue || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg space-y-4 sm:space-y-6">
        <DialogHeader className="space-y-3 text-center">
          <DialogTitle className="text-2xl font-bold">
            Merge
            {' '}
            {formatCurrency(totalValue || 0)}
            {' '}
            in positions
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            This will merge all eligible market positions.
          </DialogDescription>
        </DialogHeader>

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
              <div className="relative size-10 overflow-hidden rounded-sm bg-muted sm:size-12">
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
                <div className="flex items-start gap-2">
                  <h3 className="flex-1 text-sm leading-tight font-semibold text-foreground">
                    {market.title}
                  </h3>
                  <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Value
                  {' '}
                  {formatCurrency(market.displayValue || 0)}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={isProcessing || markets.length === 0}
            onClick={onConfirm}
          >
            {isProcessing ? 'Processing...' : 'Merge positions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
