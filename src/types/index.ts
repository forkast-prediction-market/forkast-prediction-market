// Market Types
export interface Event {
  id: number
  active_markets_count: number
  slug: string
  title: string
  description: string
  category: EventCategory
  probability: number // 0-100
  volume: number // in USDC
  endDate: Date
  isResolved: boolean
  isTrending?: boolean
  outcomes: MarketOutcome[]
  creator: string
  creatorAvatar?: string // URL for creator avatar
  icon_url: string
  tags: string[]
  show_market_icons?: boolean // Control if market icons should be shown in lists
  rules?: string // Rules for market resolution
  oracle?: string // Oracle address for resolution
}

export interface MarketOutcome {
  id: string
  name: string
  probability: number
  price: number // in USDC cents (0.01 to 0.99)
  volume: number
  isYes?: boolean // for binary markets
  avatar?: string // URL for outcome avatar/image
  marketSlug?: string // For multi-markets reference
  // For multi-markets: store both yes/no outcomes
  yesOutcome?: {
    id: string
    name: string
    outcome_index: number
  } | null
  noOutcome?: {
    id: string
    name: string
    outcome_index: number
  } | null
}

export type EventCategory = string

// User Types
export interface User {
  address?: string
  email: string
  username?: string
  bio?: string
  image?: string | null
}

export interface PublicProfileStats {
  positionsValue: number
  profitLoss: number
  volumeTraded: number
  marketsTraded: number
}

// Public Profile Types
export interface PublicProfile {
  address: string
  username?: string
  image?: string
  created_at: Date
  stats?: PublicProfileStats
}

export type ActivityType = 'Buy' | 'Sell' | 'Redeem'

export interface ActivityItem {
  id: string
  type: ActivityType
  market: {
    id: string
    title: string
    imageUrl: string
    outcome: 'Yes' | 'No'
    price: number // in cents
  }
  shares: number
  amount: number // in USD
  timestamp: Date
  transactionHash: string
}
