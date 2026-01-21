import type { ActivityOrder } from '@/types'

export type ActivityTypeFilter = 'all' | 'trades' | 'buy' | 'merge' | 'redeem'
export type ActivitySort = 'newest' | 'oldest' | 'value' | 'shares'
export type ActivityVariant = 'split' | 'merge' | 'redeem' | 'deposit' | 'withdraw' | 'sell' | 'buy' | 'trade'

export interface PublicActivityRowProps {
  activity: ActivityOrder
}
