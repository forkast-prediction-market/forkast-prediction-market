import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  char,
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
  id: char('id', { length: 66 }).primaryKey(),
  oracle: char('oracle', { length: 42 }).notNull(),
  question_id: char('question_id', { length: 66 }).notNull(),
  resolved: boolean('resolved').default(false),
  arweave_hash: text('arweave_hash'),
  creator: char('creator', { length: 42 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const markets = pgTable('markets', {
  condition_id: varchar('condition_id', { length: 66 })
    .primaryKey()
    .references(() => conditions.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  event_id: char('event_id', { length: 26 })
    .notNull()
    .references(() => events.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  title: text('title').notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  short_title: varchar('short_title', { length: 50 }),
  icon_url: text('icon_url'),
  is_active: boolean('is_active').default(true).notNull(),
  is_resolved: boolean('is_resolved').default(false).notNull(),
  metadata: text('metadata'), // JSONB as text
  current_volume_24h: numeric('current_volume_24h', { precision: 20, scale: 6 }).default('0').notNull(),
  total_volume: numeric('total_volume', { precision: 20, scale: 6 }).default('0').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const outcomes = pgTable('outcomes', {
  id: char('id', { length: 26 }).primaryKey().default(sql`generate_ulid()`),
  condition_id: char('condition_id', { length: 66 })
    .notNull()
    .references(() => conditions.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  outcome_text: text('outcome_text').notNull(),
  outcome_index: integer('outcome_index').notNull(),
  token_id: text('token_id').notNull().unique(),
  is_winning_outcome: boolean('is_winning_outcome').default(false),
  payout_value: numeric('payout_value', { precision: 20, scale: 6 }),
  current_price: numeric('current_price', { precision: 8, scale: 4 }),
  volume_24h: numeric('volume_24h', { precision: 20, scale: 6 }).default('0').notNull(),
  total_volume: numeric('total_volume', { precision: 20, scale: 6 }).default('0').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const orders = pgTable('orders', {
  id: text('id').primaryKey().default(sql`generate_ulid()`),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  condition_id: char('condition_id', { length: 66 })
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
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const marketsRelations = relations(markets, ({ one }) => ({
  event: one(events, {
    fields: [markets.event_id],
    references: [events.id],
  }),
  condition: one(conditions, {
    fields: [markets.condition_id],
    references: [conditions.id],
  }),
}))

export const conditionsRelations = relations(conditions, ({ many }) => ({
  outcomes: many(outcomes),
  markets: many(markets),
  orders: many(orders),
}))

export const outcomesRelations = relations(outcomes, ({ one, many }) => ({
  condition: one(conditions, {
    fields: [outcomes.condition_id],
    references: [conditions.id],
  }),
  orders: many(orders),
}))

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.user_id],
    references: [users.id],
  }),
  outcome: one(outcomes, {
    fields: [orders.token_id],
    references: [outcomes.token_id],
  }),
  condition: one(conditions, {
    fields: [orders.condition_id],
    references: [conditions.id],
  }),
}))
