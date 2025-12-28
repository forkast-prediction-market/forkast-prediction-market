import type { OUTCOME_INDEX } from '@/lib/constants'

export type SortOption
  = | 'currentValue'
    | 'trade'
    | 'pnlPercent'
    | 'pnlValue'
    | 'shares'
    | 'alpha'
    | 'endingSoon'
    | 'payout'
    | 'latestPrice'
    | 'avgCost'

export type ShareCardVariant = 'yes' | 'no'

export interface ShareCardPayload {
  title: string
  outcome: string
  avgPrice: string
  odds: string
  cost: string
  invested: string
  toWin: string
  imageUrl?: string
  userName?: string
  userImage?: string
  variant: ShareCardVariant
  eventSlug: string
}

export interface PositionsTotals {
  trade: number
  value: number
  diff: number
  pct: number
  toWin: number
}

export type ConditionShares = Record<typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO, number>
