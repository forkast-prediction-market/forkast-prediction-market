import { createClient } from '@supabase/supabase-js'

// Client for API routes (server-side with service role)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Tipos do banco baseados no schema
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

export interface Event {
  id: number
  slug: string
  title: string
  description: string | null
  creator: string | null // NEW: creator address
  icon_url: string | null
  show_market_icons: boolean
  rules: string | null // Rules for market resolution
  active_markets_count: number
  total_markets_count: number
  created_at: string
  updated_at: string
}

export interface Market {
  condition_id: string
  question_id: string
  oracle: string
  event_id: number
  name: string
  slug: string
  description: string | null
  short_title: string | null
  outcome_count: number
  icon_url: string | null
  is_active: boolean
  is_resolved: boolean
  resolution_data: Record<string, unknown> | null
  block_number: number
  transaction_hash: string
  block_timestamp: string
  metadata: Record<string, unknown> | null
  // NOVOS CAMPOS DE TRADING:
  current_volume_24h: number // Volume 24h
  total_volume: number // Volume total
  open_interest: number // Open interest
  created_at: string
  updated_at: string
}

export interface Outcome {
  id: number
  condition_id: string // MUDANÇA: era market_condition_id
  outcome_text: string
  outcome_index: number
  token_id: string // NOVO: token ID do ERC1155
  is_winning_outcome: boolean
  payout_value: number | null // NOVO: valor final de payout
  current_price: number | null // NEW: current market price (0.0001 to 0.9999)
  volume_24h: number // NOVO: volume 24h
  total_volume: number // NOVO: volume total
  created_at: string
  updated_at: string
}

export interface EventTag {
  id: number
  event_id: number
  tag_id: number
  created_at: string
}

// NOVOS TIPOS PARA DADOS DE TRADING (SUBGRAPHS)
export interface Condition {
  id: string // condition_id
  oracle: string
  question_id: string
  outcome_slot_count: number
  resolved: boolean
  payout_numerators: number[] | null
  payout_denominator: number | null
  arweave_hash: string | null
  creator: string | null
  total_volume: number
  open_interest: number
  active_positions_count: number
  created_at: string
  resolved_at: string | null
  updated_at: string
}

export interface UserPositionBalance {
  id: string
  user_address: string
  token_id: string
  condition_id: string
  outcome_index: number
  balance: number
  wrapped_balance: number
  total_cost: number
  realized_pnl: number
  unrealized_pnl: number
  last_updated_timestamp: string
  created_at: string
}

export interface OrderFill {
  id: string
  transaction_hash: string
  order_hash: string | null
  block_number: number
  timestamp: string
  maker: string
  taker: string
  maker_asset_id: string
  taker_asset_id: string
  maker_amount_filled: number
  taker_amount_filled: number
  fee: number
  price: number | null
  condition_id: string | null
  outcome_index: number | null
  created_at: string
}

// Tipos para dados completos com joins
export interface EventWithMarkets extends Event {
  markets: (Market & { outcomes: Outcome[] })[]
  tags: Tag[]
}

export interface MarketWithOutcomes extends Market {
  outcomes: Outcome[]
  event: Event
}

export interface MarketWithTradingData extends Market {
  outcomes: Outcome[]
  event: Event
  condition: Condition
  recent_fills: OrderFill[]
}
