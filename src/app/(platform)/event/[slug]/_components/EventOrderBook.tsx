import type { Market, Outcome } from '@/types'
import { useMemo } from 'react'
import { OUTCOME_INDEX } from '@/lib/constants'

interface OrderBookLevel {
  side: 'ask' | 'bid'
  price: number
  shares: number
  total: number
}

interface EventOrderBookProps {
  market: Market
  outcome?: Outcome
}

const priceFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

const sharesFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export default function EventOrderBook({ market, outcome }: EventOrderBookProps) {
  const {
    asks,
    bids,
    lastPrice,
    spread,
    maxShares,
    outcomeLabel,
  } = useMemo(() => buildOrderBookSnapshot(market, outcome), [market, outcome])

  const hasLevels = asks.length > 0 || bids.length > 0

  if (!hasLevels) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        Order book data is unavailable for this market right now.
      </div>
    )
  }

  return (
    <div className="relative scrollbar-hide max-h-[360px] overflow-y-auto">
      <div className="px-2">
        <div
          className={`
            sticky top-0 z-[1] grid h-9 grid-cols-[40%_20%_20%_20%] items-center border-b border-border/60 bg-background
            px-4 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase
          `}
        >
          <div className="flex h-full items-center">
            <span>{`Trade ${outcomeLabel}`}</span>
          </div>
          <div className="flex h-full items-center justify-center">
            Price
          </div>
          <div className="flex h-full items-center justify-center">
            Shares
          </div>
          <div className="flex h-full items-center justify-center">
            Total
          </div>
        </div>

        {asks.map((level, index) => (
          <OrderBookRow
            key={`ask-${level.price}`}
            level={level}
            maxShares={maxShares}
            showBadge={index === asks.length - 1 ? 'ask' : undefined}
          />
        ))}

        <div
          className={`
            sticky top-[36px] bottom-0 z-[1] grid h-9 grid-cols-[40%_20%_20%_20%] items-center border-y border-border/60
            bg-background px-4 text-xs font-medium text-muted-foreground
          `}
        >
          <div className="flex h-full items-center">
            Last:&nbsp;
            {formatPrice(lastPrice)}
          </div>
          <div className="flex h-full items-center justify-center">
            Spread:&nbsp;
            {formatPrice(spread)}
          </div>
          <div className="flex h-full items-center justify-center" />
          <div className="flex h-full items-center justify-center" />
        </div>

        {bids.map((level, index) => (
          <OrderBookRow
            key={`bid-${level.price}`}
            level={level}
            maxShares={maxShares}
            showBadge={index === 0 ? 'bid' : undefined}
          />
        ))}
      </div>
    </div>
  )
}

interface OrderBookRowProps {
  level: OrderBookLevel
  maxShares: number
  showBadge?: 'ask' | 'bid'
}

function OrderBookRow({ level, maxShares, showBadge }: OrderBookRowProps) {
  const isAsk = level.side === 'ask'
  const backgroundClass = isAsk ? 'bg-no/25 dark:bg-no/20' : 'bg-yes/25 dark:bg-yes/20'
  const hoverClass = isAsk ? 'hover:bg-no/10' : 'hover:bg-yes/10'
  const priceClass = isAsk ? 'text-no' : 'text-yes'
  const widthPercent = maxShares > 0 ? (level.shares / maxShares) * 100 : 0
  const barWidth = Math.min(100, Math.max(8, widthPercent))

  return (
    <div
      className={`
        relative grid h-9 grid-cols-[40%_20%_20%_20%] items-center pr-4 pl-0 transition-colors
        ${hoverClass}
      `}
    >
      <div className="flex h-full items-center">
        <div className="relative h-full w-full overflow-hidden">
          <div
            className={`absolute inset-0 left-0 ${backgroundClass}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
      <div className="flex h-full items-center justify-center px-4">
        <span className={`text-sm font-medium ${priceClass}`}>
          {formatPrice(level.price)}
        </span>
      </div>
      <div className="flex h-full items-center justify-center px-4">
        <span className="text-sm font-medium text-foreground">
          {sharesFormatter.format(level.shares)}
        </span>
      </div>
      <div className="flex h-full items-center justify-center px-4">
        <span className="text-sm font-medium text-foreground">
          {usdFormatter.format(level.total)}
        </span>
      </div>
      {showBadge && (
        <span
          className={`
            absolute top-1/2 left-4 -translate-y-1/2 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase
            ${showBadge === 'ask' ? 'bg-no text-white' : 'bg-yes text-white'}
          `}
        >
          {showBadge === 'ask' ? 'Asks' : 'Bids'}
        </span>
      )}
    </div>
  )
}

function buildOrderBookSnapshot(market: Market, outcome?: Outcome) {
  const outcomeToUse = outcome ?? market.outcomes[0]
  const yesOutcome = market.outcomes.find(entry => entry.outcome_index === OUTCOME_INDEX.YES) ?? market.outcomes[0]
  const yesMidPrice = getOutcomeMidPrice(yesOutcome)
  const yesPriceInCents = Math.round(yesMidPrice * 100)
  const rawBasePrice = outcomeToUse.outcome_index === OUTCOME_INDEX.YES
    ? yesPriceInCents
    : 100 - yesPriceInCents
  const basePrice = Math.max(1, Math.min(99, rawBasePrice))
  const ladderBase = basePrice

  const depth = 12
  const totalVolume = Math.max(0, market.total_volume || 0)
  const baseLiquidity = Math.max(150, Math.sqrt(totalVolume + 100) * 6)

  const asks: OrderBookLevel[] = []
  const bids: OrderBookLevel[] = []

  let stopAsks = false
  let stopBids = false

  for (let index = 0; index < depth; index += 1) {
    const distance = index + 1
    if (!stopAsks) {
      const askPrice = Math.min(99, ladderBase + distance)
      const previousAskPrice = asks[asks.length - 1]?.price
      if (askPrice > 0 && askPrice !== previousAskPrice) {
        const askShares = calculateShares(baseLiquidity, distance, depth)
        asks.push({
          side: 'ask',
          price: askPrice,
          shares: askShares,
          total: Number(((askShares * askPrice) / 100).toFixed(2)),
        })
      }
      else {
        stopAsks = true
      }
    }

    if (!stopBids) {
      const bidPrice = Math.max(1, ladderBase - distance)
      const previousBidPrice = bids[bids.length - 1]?.price
      if (bidPrice > 0 && bidPrice !== previousBidPrice) {
        const bidShares = calculateShares(baseLiquidity, distance, depth)
        bids.push({
          side: 'bid',
          price: bidPrice,
          shares: bidShares,
          total: Number(((bidShares * bidPrice) / 100).toFixed(2)),
        })
      }
      else {
        stopBids = true
      }
    }

    if (stopAsks && stopBids) {
      break
    }
  }

  const maxShares = Math.max(
    1,
    ...asks.map(level => level.shares),
    ...bids.map(level => level.shares),
  )

  const bestAsk = asks[0]?.price ?? basePrice
  const bestBid = bids[0]?.price ?? basePrice
  const spread = Math.max(0, bestAsk - bestBid)

  return {
    asks,
    bids,
    maxShares,
    lastPrice: basePrice,
    spread,
    outcomeLabel: outcomeToUse.outcome_index === OUTCOME_INDEX.YES ? 'Yes' : 'No',
  }
}

function calculateShares(baseLiquidity: number, distance: number, depth: number) {
  const proximityFactor = (depth - distance + 1) / depth
  const rawShares = baseLiquidity * proximityFactor
  return Math.max(5, Math.round(rawShares / (distance * 0.8)))
}

function getOutcomeMidPrice(outcome?: Outcome) {
  const buy = typeof outcome?.buy_price === 'number' && Number.isFinite(outcome.buy_price)
    ? clamp01(outcome.buy_price)
    : undefined
  const sell = typeof outcome?.sell_price === 'number' && Number.isFinite(outcome.sell_price)
    ? clamp01(outcome.sell_price)
    : undefined

  if (typeof buy === 'number' && typeof sell === 'number') {
    return (buy + sell) / 2
  }

  return buy ?? sell ?? 0.5
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function formatPrice(price: number) {
  return `${priceFormatter.format(price)}¢`
}
