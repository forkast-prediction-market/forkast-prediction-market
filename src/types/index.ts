import type { PostgrestError } from '@supabase/supabase-js'

export interface Event {
  id: string
  slug: string
  title: string
  description: string
  creator: string
  icon_url: string
  show_market_icons: boolean
  status: 'draft' | 'active' | 'archived'
  rules?: string
  active_markets_count: number
  total_markets_count: number
  end_date: string | null
  created_at: string
  updated_at: string
  markets: Market[]
  tags: {
    id: number
    name: string
    slug: string
    isMainCategory: boolean
  }[]
  main_tag: string
  is_bookmarked: boolean
  is_trending: boolean
}

export interface Market {
  condition_id: string
  question_id: string
  event_id: string
  title: string
  slug: string
  short_title?: string
  icon_url: string
  is_active: boolean
  is_resolved: boolean
  block_number: number
  block_timestamp: string
  metadata?: any // JSONB
  current_volume_24h: number
  total_volume: number
  created_at: string
  updated_at: string
  price: number
  probability: number
  outcomes: Outcome[]
  condition: Condition
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

interface Condition {
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

interface UserSettings {
  notifications?: {
    email_resolutions?: boolean
    inapp_order_fills?: boolean
    inapp_hide_small_fills?: boolean
    inapp_resolutions?: boolean
  }
  [key: string]: any
}

export interface User {
  id: string
  address: string
  email: string
  twoFactorEnabled: boolean | null | undefined
  username?: string
  image: string
  settings: UserSettings
  affiliate_code?: string | null
  referred_by_user_id?: string | null
  is_admin: boolean
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
  image: string
  created_at: Date
  stats?: PublicProfileStats
}

export interface Tag {
  id: number
  name: string
  slug: string
  is_main_category: boolean
  is_hidden: boolean
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
  user_avatar: string
  user_address: string
  likes_count: number
  replies_count: number
  created_at: string
  is_owner: boolean
  user_has_liked: boolean
  recent_replies?: Comment[]
}

type NotificationCategory = 'trade' | 'system' | 'general'

type NotificationLinkType
  = | 'none'
    | 'market'
    | 'event'
    | 'order'
    | 'settings'
    | 'profile'
    | 'external'
    | 'custom'

export interface Notification {
  id: string
  category: NotificationCategory
  title: string
  description: string
  created_at: string
  user_avatar?: string | null
  extra_info?: string
  time_ago?: string
  link_type?: NotificationLinkType
  link_target?: string | null
  link_url?: string | null
  link_label?: string
  metadata?: Record<string, unknown>
}

export interface AffiliateData {
  referralUrl: string
  commissionPercent: number
  stats: {
    total_referrals: number
    active_referrals: number
    total_volume: number
    total_affiliate_fees: number
  }
  recentReferrals: {
    user_id: string
    username?: string | null
    address: string
    created_at: string
  }[]
}

export interface ActivityOrder {
  id: string
  user: {
    id: string
    username: string | null
    address: string
    image: string
  }
  side: 'buy' | 'sell'
  amount: string
  price: string
  outcome: {
    index: number
    text: string
  }
  market: {
    title: string
    slug: string
    icon_url: string
    event?: {
      slug: string
      show_market_icons: boolean
    }
  }
  total_value: number
  created_at: string
  status: string
}

export interface TopHolder {
  user: {
    id: string
    username: string | null
    address: string
    image: string
  }
  net_position: string
  outcome_index: number
  outcome_text: string
}

export type OrderSide = 0 | 1 // 0 = buy, 1 = sell
export type OrderType = 0 | 1 // 0 = market, 1 = limit

export type QueryResult<T>
  = | { data: T, error: null }
    | { data: null, error: string }
    | { data: null, error: PostgrestError }

export interface SearchResultItems {
  events: Event[]
  profiles: PublicProfile[]
}

export interface SearchLoadingStates {
  events: boolean
  profiles: boolean
}

type Address = `0x${string}`

export interface BlockchainOrder {
  salt: bigint
  maker: Address
  signer: Address
  taker: Address
  referrer: Address
  affiliate: Address
  token_id: bigint
  maker_amount: bigint
  taker_amount: bigint
  expiration: bigint
  nonce: bigint
  fee_rate_bps: bigint
  affiliate_percentage: bigint
  side: number
  signature_type: number
}
