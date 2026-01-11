import type { PublicActivityRowProps } from '@/app/(platform)/[username]/_types/PublicActivityTypes'
import { CircleDollarSignIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { activityIcon, formatPriceCents, formatShares, resolveVariant } from '@/app/(platform)/[username]/_utils/PublicActivityUtils'
import { MICRO_UNIT } from '@/lib/constants'
import { formatCurrency, formatTimeAgo } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export default function PublicActivityRow({ activity, rowGridClass }: PublicActivityRowProps) {
  const variant = resolveVariant(activity)
  const { Icon, label, className } = activityIcon(variant)
  const sharesText = formatShares(activity.amount)
  const priceText = formatPriceCents(activity.price)
  const eventSlug = activity.market.event?.slug || activity.market.slug
  const outcomeText = activity.outcome?.text || 'Outcome'
  const outcomeIsYes = outcomeText.toLowerCase().includes('yes') || activity.outcome?.index === 0
  const outcomeColor = outcomeIsYes ? 'bg-yes/15 text-yes' : 'bg-no/15 text-no'
  const imageUrl = activity.market.icon_url
    ? (
        activity.market.icon_url.startsWith('http')
          ? activity.market.icon_url
          : `https://gateway.irys.xyz/${activity.market.icon_url}`
      )
    : null
  const isFundsFlow = variant === 'deposit' || variant === 'withdraw'
  const valueNumber = Number(activity.total_value) / MICRO_UNIT
  const hasValue = Number.isFinite(valueNumber)
  const isCreditVariant = variant === 'merge' || variant === 'redeem' || variant === 'deposit' || variant === 'sell'
  const isDebitVariant = variant === 'withdraw' || variant === 'split' || variant === 'buy'
  const isPositive = isCreditVariant || (!isDebitVariant && hasValue && valueNumber > 0)
  const isNegative = isDebitVariant || (!isCreditVariant && hasValue && valueNumber < 0)
  const valueDisplay = hasValue ? formatCurrency(Math.abs(valueNumber)) : '—'
  const valuePrefix = hasValue ? (isNegative ? '-' : '+') : ''
  const marketContent = isFundsFlow
    ? (
        <div className="flex min-w-0 items-center gap-2.5 pl-1">
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded bg-primary/10 text-primary">
            <CircleDollarSignIcon className="size-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="block max-w-[64ch] truncate text-sm leading-tight font-semibold text-foreground">
              {variant === 'deposit' ? 'Deposited funds' : 'Withdrew funds'}
            </div>
          </div>
        </div>
      )
    : (
        <div className="flex min-w-0 items-start gap-2.5 pl-1">
          <Link
            href={`/event/${eventSlug}`}
            className="relative size-12 shrink-0 overflow-hidden rounded bg-muted"
          >
            {imageUrl
              ? (
                  <Image
                    src={imageUrl}
                    alt={activity.market.title}
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
              className={
                `
                  block max-w-[64ch] truncate text-sm leading-tight font-semibold text-foreground no-underline
                  hover:no-underline
                `
              }
              title={activity.market.title}
            >
              {activity.market.title}
            </Link>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {(variant === 'buy' || variant === 'sell') && (
                <span className={cn('inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-semibold', outcomeColor)}>
                  {outcomeText}
                  {' '}
                  {priceText}
                </span>
              )}
              {sharesText && <span>{sharesText}</span>}
            </div>
          </div>
        </div>
      )

  return (
    <div
      className={cn(
        rowGridClass,
        `border-b p-2 transition-colors first:border-t first:border-border/60 hover:bg-muted/50 sm:px-3`,
        'last:border-b-0',
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className={cn('size-4 text-muted-foreground', className)} />
        <span>{label}</span>
      </div>

      {marketContent}

      <div className={cn('text-right text-sm font-semibold', isPositive ? 'text-yes' : 'text-foreground')}>
        {Number.isFinite(valueNumber) ? `${valuePrefix}${valueDisplay}` : '—'}
      </div>

      <div className="text-right text-xs text-muted-foreground">
        {formatTimeAgo(activity.created_at)}
      </div>
    </div>
  )
}
