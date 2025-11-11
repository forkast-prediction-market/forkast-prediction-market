import type { Event, Outcome } from '@/types'
import { useMemo } from 'react'
import { useEventOutcomeChanceChanges, useEventOutcomeChances, useMarketYesPrices } from '@/app/(platform)/event/[slug]/_components/EventOutcomeChanceProvider'
import { OUTCOME_INDEX } from '@/lib/constants'
import { toCents } from '@/lib/formatters'

interface BuildEventMarketRowsOptions {
  outcomeChances: Record<string, number>
  outcomeChanceChanges: Record<string, number>
  marketYesPrices: Record<string, number>
}

export interface EventMarketRowChanceMeta {
  chanceDisplay: string
  normalizedChance: number
  isSubOnePercent: boolean
  shouldShowChanceChange: boolean
  chanceChangeLabel: string
  isChanceChangePositive: boolean
}

export interface EventMarketRow {
  market: Event['markets'][number]
  yesOutcome?: Outcome
  noOutcome?: Outcome
  yesPriceValue: number | null
  noPriceValue: number | null
  yesPriceCentsOverride: number | null
  chanceMeta: EventMarketRowChanceMeta
}

export interface EventMarketRowsResult {
  hasChanceData: boolean
  rows: EventMarketRow[]
}

const MIN_PERCENT = 0
const MAX_PERCENT = 100

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function buildEventMarketRows(
  event: Event,
  { outcomeChances, outcomeChanceChanges, marketYesPrices }: BuildEventMarketRowsOptions,
): EventMarketRowsResult {
  const hasChanceData = event.markets.every(market => Number.isFinite(outcomeChances[market.condition_id]))

  if (!hasChanceData) {
    return { hasChanceData: false, rows: [] }
  }

  const sortedMarkets = [...event.markets].sort((a, b) => {
    const aChance = outcomeChances[a.condition_id]
    const bChance = outcomeChances[b.condition_id]
    return (bChance ?? 0) - (aChance ?? 0)
  })

  const rows = sortedMarkets.map((market) => {
    const yesOutcome = market.outcomes[OUTCOME_INDEX.YES]
    const noOutcome = market.outcomes[OUTCOME_INDEX.NO]
    const yesPriceOverride = marketYesPrices[market.condition_id]
    const normalizedYesPrice = typeof yesPriceOverride === 'number'
      ? clamp(yesPriceOverride, 0, 1)
      : null
    const yesPriceValue = normalizedYesPrice ?? yesOutcome?.buy_price ?? null
    const noPriceValue = normalizedYesPrice != null
      ? clamp(1 - normalizedYesPrice, 0, 1)
      : noOutcome?.buy_price ?? null
    const yesPriceCentsOverride = normalizedYesPrice != null ? toCents(normalizedYesPrice) : null

    const rawChance = outcomeChances[market.condition_id]
    const normalizedChance = clamp(rawChance ?? 0, MIN_PERCENT, MAX_PERCENT)
    const roundedChance = Math.round(normalizedChance)
    const roundedThresholdChance = Math.round(normalizedChance * 10) / 10
    const isSubOnePercent = roundedThresholdChance > 0 && roundedThresholdChance < 1
    const chanceDisplay = isSubOnePercent ? '<1%' : `${roundedChance}%`

    const rawChanceChange = outcomeChanceChanges[market.condition_id]
    const normalizedChanceChange = typeof rawChanceChange === 'number' && Number.isFinite(rawChanceChange)
      ? rawChanceChange
      : 0
    const absoluteChanceChange = Math.abs(normalizedChanceChange)
    const roundedChanceChange = Math.round(absoluteChanceChange)
    const shouldShowChanceChange = roundedChanceChange >= 1
    const chanceChangeLabel = `${roundedChanceChange}%`
    const isChanceChangePositive = normalizedChanceChange > 0

    return {
      market,
      yesOutcome,
      noOutcome,
      yesPriceValue,
      noPriceValue,
      yesPriceCentsOverride,
      chanceMeta: {
        chanceDisplay,
        normalizedChance,
        isSubOnePercent,
        shouldShowChanceChange,
        chanceChangeLabel,
        isChanceChangePositive,
      },
    }
  })

  return { hasChanceData: true, rows }
}

export function useEventMarketRows(event: Event): EventMarketRowsResult {
  const outcomeChances = useEventOutcomeChances()
  const outcomeChanceChanges = useEventOutcomeChanceChanges()
  const marketYesPrices = useMarketYesPrices()

  return useMemo(
    () => buildEventMarketRows(event, { outcomeChances, outcomeChanceChanges, marketYesPrices }),
    [event, outcomeChances, outcomeChanceChanges, marketYesPrices],
  )
}
