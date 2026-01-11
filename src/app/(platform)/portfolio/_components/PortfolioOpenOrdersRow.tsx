import type { PortfolioUserOpenOrder } from '@/app/(platform)/portfolio/_types/PortfolioOpenOrdersTypes'
import { XIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import {
  formatCents,
  formatExpirationLabel,
  getOrderFilledShares,
  getOrderTotalShares,
  microToUnit,
} from '@/app/(platform)/portfolio/_utils/PortfolioOpenOrdersUtils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface PortfolioOpenOrdersRowProps {
  order: PortfolioUserOpenOrder
  rowGridClass: string
}

export default function PortfolioOpenOrdersRow({ order, rowGridClass }: PortfolioOpenOrdersRowProps) {
  const totalShares = getOrderTotalShares(order)
  const filledShares = getOrderFilledShares(order)
  const totalValue = order.side === 'buy'
    ? microToUnit(order.maker_amount)
    : microToUnit(order.taker_amount)
  const filledLabel = `${filledShares.toLocaleString(undefined, { maximumFractionDigits: 3 })} / ${totalShares.toLocaleString(undefined, { maximumFractionDigits: 3 })}`
  const outcomeText = order.outcome.text || (order.outcome.index === 0 ? 'Yes' : 'No')
  const outcomeIsYes = order.outcome.index === 0
  const outcomeColor = outcomeIsYes ? 'bg-yes/15 text-yes' : 'bg-no/15 text-no'
  const priceLabel = formatCents(order.price)
  const expirationLabel = formatExpirationLabel(order)
  const marketIcon = order.market.icon_url || undefined
  const eventSlug = order.market.event_slug || order.market.slug

  return (
    <div
      className={cn(
        rowGridClass,
        `border-b px-2 py-3 transition-colors first:border-t first:border-border/60 hover:bg-muted/50 sm:px-3`,
        'last:border-b-0',
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Link
          href={`/event/${eventSlug}`}
          className="relative size-12 shrink-0 overflow-hidden rounded bg-muted"
        >
          {marketIcon
            ? (
                <Image
                  src={marketIcon}
                  alt={order.market.title}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              )
            : (
                <div className="grid size-full place-items-center text-2xs text-muted-foreground">
                  No image
                </div>
              )}
        </Link>
        <div className="min-w-0 space-y-1">
          <Link
            href={`/event/${eventSlug}`}
            className="line-clamp-2 block text-sm font-semibold no-underline hover:no-underline"
            title={order.market.title}
          >
            {order.market.title}
          </Link>
        </div>
      </div>

      <div className="text-center text-sm font-semibold">
        {order.side === 'buy' ? 'Buy' : 'Sell'}
      </div>

      <div className="text-left text-sm font-semibold">
        <span className={cn('inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-sm font-semibold md:text-sm', outcomeColor)}>
          {outcomeText}
        </span>
      </div>

      <div className="text-center text-sm font-semibold">
        {priceLabel}
      </div>

      <div className="text-center text-sm font-semibold">
        {filledLabel}
      </div>

      <div className="text-center text-sm font-semibold">
        {formatCurrency(totalValue)}
      </div>

      <div className="text-left text-xs font-medium text-muted-foreground">
        {expirationLabel}
      </div>

      <div className="flex justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-lg"
              aria-label="Cancel"
            >
              <XIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cancel</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
