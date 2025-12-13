'use client'

import type { Market, Outcome } from '@/types'
import { useEffect, useMemo, useState } from 'react'
import EventOrderBook, {
  useOrderBookSummaries,
} from '@/app/(platform)/event/[slug]/_components/EventOrderBook'
import { useMarketYesPrices } from '@/app/(platform)/event/[slug]/_components/EventOutcomeChanceProvider'
import { OUTCOME_INDEX } from '@/lib/constants'
import { toCents } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useOrder } from '@/stores/useOrder'

interface EventSingleMarketOrderBookProps {
  market: Market
  eventSlug: string
}

type OutcomeToggleIndex = typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO

export default function EventSingleMarketOrderBook({ market, eventSlug }: EventSingleMarketOrderBookProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const orderMarket = useOrder(state => state.market)
  const orderOutcome = useOrder(state => state.outcome)
  const setOrderMarket = useOrder(state => state.setMarket)
  const setOrderOutcome = useOrder(state => state.setOutcome)

  const initialOutcomeIndex = useMemo<OutcomeToggleIndex>(() => {
    if (orderMarket?.condition_id === market.condition_id && orderOutcome) {
      return orderOutcome.outcome_index === OUTCOME_INDEX.NO ? OUTCOME_INDEX.NO : OUTCOME_INDEX.YES
    }
    return OUTCOME_INDEX.YES
  }, [orderMarket?.condition_id, orderOutcome, market.condition_id])

  const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState<OutcomeToggleIndex>(initialOutcomeIndex)

  useEffect(() => {
    if (orderMarket?.condition_id === market.condition_id && orderOutcome) {
      setSelectedOutcomeIndex(orderOutcome.outcome_index === OUTCOME_INDEX.NO ? OUTCOME_INDEX.NO : OUTCOME_INDEX.YES)
    }
  }, [orderMarket?.condition_id, orderOutcome, market.condition_id])

  const tokenIds = useMemo(
    () => market.outcomes
      .map(outcome => outcome.token_id)
      .filter((id): id is string => Boolean(id)),
    [market.outcomes],
  )
  const yesPriceMap = useMarketYesPrices()
  const yesPriceOverride = yesPriceMap[market.condition_id]
  const normalizedYesPrice = typeof yesPriceOverride === 'number'
    ? Math.max(0, Math.min(1, yesPriceOverride))
    : null
  const yesPriceCentsOverride = normalizedYesPrice != null ? toCents(normalizedYesPrice) : null

  const {
    data: orderBookSummaries,
    isLoading: isOrderBookLoading,
  } = useOrderBookSummaries(tokenIds, { enabled: isExpanded })

  const selectedOutcome: Outcome | undefined = market.outcomes[selectedOutcomeIndex] ?? market.outcomes[0]
  const isLoadingSummaries = isExpanded && isOrderBookLoading && !orderBookSummaries
  const lastPriceOverrideCents = yesPriceCentsOverride === null
    ? null
    : selectedOutcomeIndex === OUTCOME_INDEX.YES
      ? yesPriceCentsOverride
      : Math.max(0, Number((100 - yesPriceCentsOverride).toFixed(1)))

  function handleOutcomeSelection(outcomeIndex: OutcomeToggleIndex) {
    setSelectedOutcomeIndex(outcomeIndex)
    const outcome = market.outcomes[outcomeIndex]
    if (!outcome) {
      return
    }
    setOrderMarket(market)
    setOrderOutcome(outcome)
  }

  if (market.outcomes.length < 2) {
    return <></>
  }

  return (
    <div className="rounded-lg border transition-all duration-200 ease-in-out">
      <button
        type="button"
        onClick={() => setIsExpanded(current => !current)}
        className={cn(
          `
            flex w-full items-center justify-between p-4 text-left transition-colors
            hover:bg-muted/50
            focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            focus-visible:ring-offset-background focus-visible:outline-none
          `,
        )}
        aria-expanded={isExpanded}
      >
        <span className="text-lg font-medium">Order Book</span>
        <span
          aria-hidden="true"
          className={cn(
            `
              pointer-events-none flex size-8 items-center justify-center rounded-md border border-border/60
              bg-background text-muted-foreground transition
            `,
            isExpanded ? 'bg-muted/50' : '',
          )}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('transition-transform', { 'rotate-180': isExpanded })}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-border/30 px-3 pb-3">
          <div className="flex flex-wrap gap-3 py-3 text-sm font-semibold">
            <OutcomeToggle
              label="Trade Yes"
              selected={selectedOutcomeIndex === OUTCOME_INDEX.YES}
              onClick={() => handleOutcomeSelection(OUTCOME_INDEX.YES)}
            />
            <OutcomeToggle
              label="Trade No"
              selected={selectedOutcomeIndex === OUTCOME_INDEX.NO}
              onClick={() => handleOutcomeSelection(OUTCOME_INDEX.NO)}
            />
          </div>
          <EventOrderBook
            market={market}
            outcome={selectedOutcome}
            summaries={orderBookSummaries}
            isLoadingSummaries={isLoadingSummaries}
            lastPriceOverrideCents={lastPriceOverrideCents}
            eventSlug={eventSlug}
          />
        </div>
      )}
    </div>
  )
}

interface OutcomeToggleProps {
  label: string
  selected: boolean
  onClick: () => void
}

function OutcomeToggle({ label, selected, onClick }: OutcomeToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-sm font-semibold transition-colors',
        selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}
