import type { ActivityOrder } from '@/types'

export type HistoryTypeFilter = 'all' | 'trades' | 'buy' | 'merge' | 'redeem'
export type HistorySort = 'newest' | 'oldest' | 'value' | 'shares'
export type ActivityVariant = 'split' | 'merge' | 'redeem' | 'deposit' | 'withdraw' | 'sell' | 'buy' | 'trade'

export interface PublicHistoryRowProps {
  activity: ActivityOrder
  rowGridClass: string
}
