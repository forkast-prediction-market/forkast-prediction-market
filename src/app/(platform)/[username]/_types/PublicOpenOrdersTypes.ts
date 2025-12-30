import type { UserOpenOrder } from '@/types'

export type OpenOrdersSort = 'market' | 'filled' | 'total' | 'date' | 'resolving'

export type PublicUserOpenOrder = UserOpenOrder & {
  market: UserOpenOrder['market'] & {
    icon_url?: string
    event_slug?: string
    event_title?: string
  }
}
