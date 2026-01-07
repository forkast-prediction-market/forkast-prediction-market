import type { UserOpenOrder } from '@/types'

export type PortfolioOpenOrdersSort = 'market' | 'filled' | 'total' | 'date' | 'resolving'

export type PortfolioUserOpenOrder = UserOpenOrder & {
  market: UserOpenOrder['market'] & {
    icon_url?: string
    event_slug?: string
    event_title?: string
  }
}
