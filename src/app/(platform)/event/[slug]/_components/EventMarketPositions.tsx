'use client'

import type { Event, UserPosition } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { AlertCircleIcon, ShareIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PositionShareDialog } from '@/components/PositionShareDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ORDER_SIDE, OUTCOME_INDEX } from '@/lib/constants'
import { fetchUserPositionsForMarket } from '@/lib/data-api/user'
import { formatAmountInputValue, formatCentsLabel, formatCurrency, formatPercent, fromMicro, sharesFormatter } from '@/lib/formatters'
import { buildShareCardPayload } from '@/lib/share-card'
import { getUserPublicAddress } from '@/lib/user-address'
import { cn } from '@/lib/utils'
import { useIsSingleMarket, useOrder } from '@/stores/useOrder'
import { useUser } from '@/stores/useUser'

interface EventMarketPositionsProps {
  market: Event['markets'][number]
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const POSITIONS_GRID_TEMPLATE = 'minmax(120px,1fr) repeat(4, minmax(80px,1fr)) minmax(150px,auto)'

function buildShareCardPosition(position: UserPosition) {
  const outcomeText = position.outcome_text
    || (position.outcome_index === 1 ? 'No' : 'Yes')
  const quantity = toNumber(position.size)
    ?? (typeof position.total_shares === 'number' ? position.total_shares : 0)
  const avgPrice = toNumber(position.avgPrice)
    ?? Number(fromMicro(String(position.average_position ?? 0), 6))
  const totalValue = toNumber(position.currentValue)
    ?? Number(fromMicro(String(position.total_position_value ?? 0), 2))
  const currentPrice = quantity > 0 ? totalValue / quantity : avgPrice
  const eventSlug = position.market.event?.slug || position.market.slug

  return {
    title: position.market.title,
    outcome: outcomeText,
    outcomeIndex: typeof position.outcome_index === 'number' ? position.outcome_index : undefined,
    avgPrice: Number.isFinite(avgPrice) ? avgPrice : 0,
    curPrice: Number.isFinite(currentPrice) ? currentPrice : avgPrice,
    size: Number.isFinite(quantity) ? quantity : 0,
    icon: position.market.icon_url,
    eventSlug,
  }
}

function MarketPositionRow({
  position,
  onSell,
  onShare,
}: {
  position: UserPosition
  onSell: (position: UserPosition) => void
  onShare: (position: UserPosition) => void
}) {
  const outcomeText = position.outcome_text
    || (position.outcome_index === 1 ? 'No' : 'Yes')
  const normalizedOutcome = outcomeText?.toLowerCase() ?? ''
  const explicitOutcomeIndex = typeof position.outcome_index === 'number' ? position.outcome_index : undefined
  const resolvedOutcomeIndex = explicitOutcomeIndex != null
    ? explicitOutcomeIndex
    : normalizedOutcome === 'no'
      ? OUTCOME_INDEX.NO
      : OUTCOME_INDEX.YES
  const isYesOutcome = resolvedOutcomeIndex === OUTCOME_INDEX.YES
  const quantity = toNumber(position.size)
    ?? (typeof position.total_shares === 'number' ? position.total_shares : 0)
  const formattedQuantity = quantity > 0
    ? sharesFormatter.format(quantity)
    : '—'
  const averagePriceDollars = toNumber(position.avgPrice)
    ?? Number(fromMicro(String(position.average_position ?? 0), 6))
  const averageLabel = formatCentsLabel(averagePriceDollars, { fallback: '—' })
  const totalValue = toNumber(position.currentValue)
    ?? Number(fromMicro(String(position.total_position_value ?? 0), 2))
  const valueLabel = formatCurrency(Math.max(0, totalValue), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const baseCostValue = toNumber(position.totalBought)
    ?? toNumber(position.initialValue)
    ?? (typeof position.total_position_cost === 'number'
      ? Number(fromMicro(String(position.total_position_cost), 2))
      : null)
  const costLabel = baseCostValue != null
    ? formatCurrency(baseCostValue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null
  const realizedPnlValue = toNumber(position.realizedPnl)
    ?? toNumber(position.cashPnl)
    ?? 0
  const unrealizedValue = baseCostValue != null
    ? Number((totalValue - baseCostValue).toFixed(6))
    : 0
  const totalProfitLossValue = Number((unrealizedValue + realizedPnlValue).toFixed(6))
  const percentFromPayload = toNumber(position.percentPnl)
    ?? toNumber(position.profit_loss_percent)
  const percentSource = percentFromPayload ?? (baseCostValue && baseCostValue !== 0
    ? (totalProfitLossValue / baseCostValue) * 100
    : 0)
  const normalizedPercent = Math.abs(percentSource) <= 1 && percentFromPayload !== null
    ? percentSource * 100
    : percentSource
  const percentDigits = Math.abs(normalizedPercent) >= 10 ? 0 : 1
  const percentLabel = formatPercent(Math.abs(normalizedPercent), { digits: percentDigits })
  const isPositive = totalProfitLossValue >= 0
  const isNeutralReturn = Math.abs(totalProfitLossValue) < 0.005
  const neutralReturnLabel = formatCurrency(Math.abs(totalProfitLossValue), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const displayedReturnValue = isNeutralReturn
    ? neutralReturnLabel
    : `${isPositive ? '+' : '-'}${neutralReturnLabel}`
  const outcomeButtonLabel = outcomeText || (isYesOutcome ? 'Yes' : 'No')

  const returnColorClass = isPositive ? 'text-yes' : 'text-no'
  const signedPercentLabel = `${isPositive ? '+' : '-'}${percentLabel}`

  function formatSignedCurrency(value: number) {
    const abs = formatCurrency(Math.abs(value), { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (value > 0) {
      return `+${abs}`
    }
    if (value < 0) {
      return `-${abs}`
    }
    return `+${abs}`
  }

  const unrealizedLabel = formatSignedCurrency(unrealizedValue)
  const realizedLabel = formatSignedCurrency(realizedPnlValue)
  const totalLabel = displayedReturnValue

  return (
    <div
      className="grid items-center gap-3 px-3 py-1 text-2xs leading-tight text-foreground sm:text-xs"
      style={{ gridTemplateColumns: POSITIONS_GRID_TEMPLATE }}
    >
      <div className="flex items-center">
        <span
          className={cn(
            `
              inline-flex min-h-7 min-w-14 items-center justify-center rounded-sm px-4 text-xs font-semibold
              tracking-wide
            `,
            isYesOutcome ? 'bg-yes/15 text-yes-foreground' : 'bg-no/15 text-no-foreground',
          )}
        >
          {outcomeButtonLabel}
        </span>
      </div>
      <div className="text-center text-2xs leading-tight font-semibold sm:text-sm">
        {formattedQuantity}
      </div>
      <div className="text-center text-2xs leading-tight font-semibold sm:text-sm">
        {averageLabel}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-2xs font-semibold sm:text-sm">{valueLabel}</span>
        <span className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
          {costLabel ? `Cost ${costLabel}` : 'Cost —'}
        </span>
      </div>
      <div className="flex items-center gap-1 text-2xs leading-tight font-semibold sm:text-sm">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-flex items-center"
                style={{ borderBottom: '1px dotted currentColor', paddingBottom: '0.04rem' }}
              >
                {displayedReturnValue}
              </span>
              {!isNeutralReturn && (
                <span className={cn('text-2xs font-semibold sm:text-sm', returnColorClass)}>
                  (
                  {signedPercentLabel}
                  )
                </span>
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={6}
            hideArrow={true}
            className="relative w-56 border border-border bg-background text-sm leading-tight text-foreground shadow-lg"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Unrealized</span>
                <span className="font-semibold text-no">{unrealizedLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Realized</span>
                <span className="font-semibold">{realizedLabel}</span>
              </div>
              <div className="my-1 border-t border-border" />
              <div className="flex items-center justify-between gap-3">
                <span>Total</span>
                <span className="font-semibold">
                  {totalLabel}
                  {!isNeutralReturn && (
                    <span className={cn('ml-1 font-semibold', returnColorClass)}>
                      (
                      {signedPercentLabel}
                      )
                    </span>
                  )}
                </span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-8 rounded-md border border-border/70 bg-transparent px-3 text-xs font-semibold',
            'hover:bg-muted/30 dark:border-white/30 dark:text-white dark:hover:bg-white/10',
          )}
          onClick={() => onSell(position)}
        >
          Sell
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Share ${outcomeButtonLabel} position`}
          className={cn(
            'size-8 rounded-md border border-border/70 bg-transparent text-foreground',
            'hover:bg-muted/30 dark:border-white/30 dark:text-white dark:hover:bg-white/10',
          )}
          onClick={() => onShare(position)}
        >
          <ShareIcon className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export default function EventMarketPositions({ market }: EventMarketPositionsProps) {
  const user = useUser()
  const userAddress = getUserPublicAddress(user)
  const isMobile = useIsMobile()
  const isSingleMarket = useIsSingleMarket()
  const setOrderMarket = useOrder(state => state.setMarket)
  const setOrderOutcome = useOrder(state => state.setOutcome)
  const setOrderSide = useOrder(state => state.setSide)
  const setOrderAmount = useOrder(state => state.setAmount)
  const setIsMobileOrderPanelOpen = useOrder(state => state.setIsMobileOrderPanelOpen)
  const orderInputRef = useOrder(state => state.inputRef)
  const setOrderUserShares = useOrder(state => state.setUserShares)

  const positionStatus = market.is_active && !market.is_resolved ? 'active' : 'closed'

  const {
    status,
    data,
    refetch,
  } = useQuery({
    queryKey: ['user-market-positions', userAddress, market.condition_id, positionStatus],
    queryFn: ({ signal }) =>
      fetchUserPositionsForMarket({
        pageParam: 0,
        userAddress,
        conditionId: market.condition_id,
        status: positionStatus,
        signal,
      }),
    enabled: Boolean(userAddress && market.condition_id),
    staleTime: 1000 * 60 * 5,
    refetchInterval: userAddress ? 10_000 : false,
    refetchIntervalInBackground: true,
    gcTime: 1000 * 60 * 10,
  })

  const positions = useMemo(() => data ?? [], [data])
  const loading = status === 'pending' && Boolean(user?.proxy_wallet_address)
  const hasInitialError = status === 'error' && Boolean(user?.proxy_wallet_address)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [sharePosition, setSharePosition] = useState<UserPosition | null>(null)

  const aggregatedShares = useMemo(() => {
    const map: Record<string, Record<typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO, number>> = {}

    positions.forEach((positionItem) => {
      const quantity = typeof positionItem.total_shares === 'number' ? positionItem.total_shares : null
      if (!quantity || quantity <= 0) {
        return
      }
      const conditionId = positionItem.market?.condition_id || market.condition_id
      if (!conditionId) {
        return
      }

      const normalizedOutcome = positionItem.outcome_text?.toLowerCase()
      const explicitOutcomeIndex = typeof positionItem.outcome_index === 'number' ? positionItem.outcome_index : undefined
      const resolvedOutcomeIndex = explicitOutcomeIndex != null
        ? explicitOutcomeIndex
        : normalizedOutcome === 'no'
          ? OUTCOME_INDEX.NO
          : OUTCOME_INDEX.YES

      if (!map[conditionId]) {
        map[conditionId] = {
          [OUTCOME_INDEX.YES]: 0,
          [OUTCOME_INDEX.NO]: 0,
        }
      }

      const bucket = resolvedOutcomeIndex === OUTCOME_INDEX.NO ? OUTCOME_INDEX.NO : OUTCOME_INDEX.YES
      map[conditionId][bucket] += quantity
    })

    return map
  }, [market.condition_id, positions])

  useEffect(() => {
    setOrderUserShares(aggregatedShares, { replace: true })
  }, [aggregatedShares, setOrderUserShares])

  const handleSell = useCallback((positionItem: UserPosition) => {
    if (!market) {
      return
    }

    const normalizedOutcome = positionItem.outcome_text?.toLowerCase()
    const explicitOutcomeIndex = typeof positionItem.outcome_index === 'number' ? positionItem.outcome_index : undefined
    const resolvedOutcomeIndex = explicitOutcomeIndex != null
      ? explicitOutcomeIndex
      : normalizedOutcome === 'no'
        ? OUTCOME_INDEX.NO
        : OUTCOME_INDEX.YES
    const targetOutcome = market.outcomes.find(outcome => outcome.outcome_index === resolvedOutcomeIndex)
      ?? market.outcomes[0]

    setOrderMarket(market)
    if (targetOutcome) {
      setOrderOutcome(targetOutcome)
    }
    setOrderSide(ORDER_SIDE.SELL)

    const shares = typeof positionItem.total_shares === 'number' ? positionItem.total_shares : 0
    if (shares > 0) {
      setOrderAmount(formatAmountInputValue(shares))
    }
    else {
      setOrderAmount('')
    }

    if (isMobile) {
      setIsMobileOrderPanelOpen(true)
    }
    else {
      orderInputRef?.current?.focus()
    }
  }, [isMobile, market, orderInputRef, setIsMobileOrderPanelOpen, setOrderAmount, setOrderMarket, setOrderOutcome, setOrderSide])

  const shareCardPayload = useMemo(() => {
    if (!sharePosition) {
      return null
    }
    return buildShareCardPayload(buildShareCardPosition(sharePosition), {
      userName: user?.username || undefined,
      userImage: user?.image || undefined,
    })
  }, [sharePosition, user?.image, user?.username])

  const handleShareOpenChange = useCallback((open: boolean) => {
    setIsShareDialogOpen(open)
    if (!open) {
      setSharePosition(null)
    }
  }, [])

  const handleShareClick = useCallback((positionItem: UserPosition) => {
    setSharePosition(positionItem)
    setIsShareDialogOpen(true)
  }, [])

  if (!userAddress) {
    return <></>
  }

  if (hasInitialError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Failed to load positions</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>We couldn&apos;t fetch your positions for this market.</span>
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (loading || positions.length === 0) {
    return null
  }

  return (
    <section
      className="overflow-hidden rounded-xl border border-border/60 bg-background/80"
    >
      {isSingleMarket && (
        <div className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Positions</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="min-w-190 px-2 pb-2">
          <div
            className={`
              grid h-9 items-center gap-3 border-b border-border/60 bg-background px-3 text-2xs font-semibold
              tracking-wide text-muted-foreground uppercase
            `}
            style={{ gridTemplateColumns: POSITIONS_GRID_TEMPLATE }}
          >
            <span>Outcome</span>
            <span className="text-center">Qty</span>
            <span className="text-center">Avg</span>
            <span>Value</span>
            <span>Return</span>
            <span aria-hidden="true" />
          </div>
          <div className="mt-2">
            {positions.map(position => (
              <MarketPositionRow
                key={`${position.outcome_text}-${position.last_activity_at}`}
                position={position}
                onSell={handleSell}
                onShare={handleShareClick}
              />
            ))}
          </div>
        </div>
      </div>
      <PositionShareDialog
        open={isShareDialogOpen}
        onOpenChange={handleShareOpenChange}
        payload={shareCardPayload}
      />
    </section>
  )
}
