export interface Event {
  id: string
  slug: string
  title: string
  description: string
  creator: string
  icon_url: string
  show_market_icons: boolean
  rules?: string
  active_markets_count: number
  total_markets_count: number
  created_at: string
  updated_at: string
  markets: Market[]
  tags: string[]
  main_tag: string
  is_bookmarked: boolean
  is_trending: boolean
}

export interface Market {
  condition_id: string
  question_id: string
  oracle: string
  event_id: string
  title: string
  slug: string
  description: string
  short_title?: string
  outcome_count: number
  icon_url: string
  is_active: boolean
  is_resolved: boolean
  resolution_data?: any // JSONB
  block_number: number
  transaction_hash: string
  block_timestamp: string
  metadata?: any // JSONB
  current_volume_24h: number
  total_volume: number
  open_interest: number
  created_at: string
  updated_at: string
  price: number
  probability: number
  outcomes: Outcome[]
  condition?: Condition
}

export interface Outcome {
  id: string
  condition_id: string
  outcome_text: string
  outcome_index: number
  token_id: string
  is_winning_outcome: boolean
  payout_value?: number
  current_price?: number
  volume_24h: number
  total_volume: number
  created_at: string
  updated_at: string
}

export interface Condition {
  id: string
  oracle: string
  question_id: string
  outcome_slot_count: number
  resolved: boolean
  payout_numerators?: number[]
  payout_denominator?: number
  arweave_hash?: string
  creator?: string
  total_volume: number
  open_interest: number
  active_positions_count: number
  created_at: string
  resolved_at?: string
  updated_at: string
}

export interface User {
  id: string
  address: string
  email: string
  settings: string
  username?: string
  image?: string | null
}

export interface PublicProfileStats {
  positions_value: number
  profit_loss: number
  volume_traded: number
  markets_traded: number
}

export interface PublicProfile {
  address: string
  username?: string
  image?: string
  created_at: Date
  stats?: PublicProfileStats
}

// Content Types
export interface Tag {
  id: number
  name: string
  slug: string
  is_main_category: boolean
  display_order: number
  parent_tag_id: number | null
  active_markets_count: number
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  content: string
  user_id: string
  username: string
  user_avatar: string | null
  user_address: string
  likes_count: number
  replies_count: number
  created_at: string
  is_owner: boolean
  user_has_liked: boolean
  recent_replies?: Comment[]
}

// Activity Types
export type ActivityType = 'Buy' | 'Sell' | 'Redeem'

export interface ActivityItem {
  id: string
  type: ActivityType
  market: {
    id: string
    title: string
    image_url: string
    outcome: 'Yes' | 'No'
    price: number
  }
  shares: number
  amount: number
  timestamp: Date
  transaction_hash: string
}

export type QueryResult<T>
  = | { data: T, error: null }
    | { data: null, error: string }
