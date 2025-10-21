import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from './auth'
import { events } from './events'

export const conditions = pgTable('conditions', {
  id: text('id').primaryKey(),
  oracle: text('oracle').notNull(),
  question_id: text('question_id').notNull(),
  outcome_slot_count: integer('outcome_slot_count').notNull(),
  resolved: boolean('resolved').default(false).notNull(),
  payout_numerators: text('payout_numerators'), // JSON array as text
  payout_denominator: integer('payout_denominator'),
  arweave_hash: text('arweave_hash'),
  creator: text('creator'),
  total_volume: numeric('total_volume').default('0').notNull(),
  open_interest: numeric('open_interest').default('0').notNull(),
  active_positions_count: integer('active_positions_count').default(0).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  resolved_at: timestamp('resolved_at'),
  updated_at: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const markets = pgTable('markets', {
  id: text('id').primaryKey(),
  condition_id: text('condition_id')
    .notNull()
    .references(() => conditions.id, { onDelete: 'cascade' }),
  question_id: text('question_id').notNull(),
  event_id: text('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  short_title: text('short_title'),
  icon_url: text('icon_url'),
  is_active: boolean('is_active').default(true).notNull(),
  is_resolved: boolean('is_resolved').default(false).notNull(),
  block_number: integer('block_number'),
  block_timestamp: timestamp('block_timestamp'),
  metadata: text('metadata'), // JSONB as text
  current_volume_24h: numeric('current_volume_24h').default('0').notNull(),
  total_volume: numeric('total_volume').default('0').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const outcomes = pgTable('outcomes', {
  id: text('id').primaryKey(),
  condition_id: text('condition_id')
    .notNull()
    .references(() => conditions.id, { onDelete: 'cascade' }),
  outcome_text: text('outcome_text').notNull(),
  outcome_index: integer('outcome_index').notNull(),
  token_id: text('token_id').notNull().unique(),
  is_winning_outcome: boolean('is_winning_outcome').default(false).notNull(),
  payout_value: numeric('payout_value'),
  current_price: numeric('current_price'),
  volume_24h: numeric('volume_24h').default('0').notNull(),
  total_volume: numeric('total_volume').default('0').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  condition_id: text('condition_id')
    .notNull()
    .references(() => conditions.id),
  token_id: text('token_id')
    .notNull()
    .references(() => outcomes.token_id),
  type: varchar('type', { length: 10 }).notNull().default('market'), // 'market' | 'limit'
  side: varchar('side', { length: 4 }).notNull(), // 'buy' | 'sell'
  amount: numeric('amount').notNull(),
  price: numeric('price'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  affiliate_user_id: text('affiliate_user_id').references(() => users.id),
  trade_fee_bps: integer('trade_fee_bps').default(0),
  affiliate_share_bps: integer('affiliate_share_bps').default(0),
  fork_fee_amount: numeric('fork_fee_amount').default('0'),
  affiliate_fee_amount: numeric('affiliate_fee_amount').default('0'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})
