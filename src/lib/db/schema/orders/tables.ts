import { sql } from 'drizzle-orm'
import {
  char,
  check,
  index,
  integer,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'
import { conditions, outcomes } from '@/lib/db/schema/events/tables'

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
  trade_fee_bps: integer('trade_fee_bps').notNull().default(0),
  affiliate_share_bps: integer('affiliate_share_bps').notNull().default(0),
  fork_fee_amount: numeric('fork_fee_amount').notNull().default('0'),
  affiliate_fee_amount: numeric('affiliate_fee_amount').notNull().default('0'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => ({
  // Performance indexes
  idxOrdersUserId: index('idx_orders_user_id').on(table.user_id),
  idxOrdersCondition: index('idx_orders_condition').on(table.condition_id, table.token_id),
  idxOrdersStatus: index('idx_orders_status').on(table.status),
  idxOrdersCreatedAt: index('idx_orders_created_at').on(table.created_at),

  // RLS policies
  serviceRoleAllOrders: pgPolicy('service_role_all_orders', {
    as: 'permissive',
    to: 'service_role',
    for: 'all',
    using: sql`TRUE`,
    withCheck: sql`TRUE`,
  }),

  // Check constraints
  typeCheck: check('orders_type_check', sql`${table.type} IN ('market', 'limit')`),
  sideCheck: check('orders_side_check', sql`${table.side} IN ('buy', 'sell')`),
  statusCheck: check('orders_status_check', sql`${table.status} IN ('pending', 'filled', 'cancelled')`),
  amountCheck: check('orders_amount_check', sql`${table.amount} > 0`),
  priceCheck: check('orders_price_check', sql`${table.price} IS NULL OR (${table.price} >= 0.0001 AND ${table.price} <= 0.9999)`),
  tradeFeeCheck: check('orders_trade_fee_bps_check', sql`${table.trade_fee_bps} >= 0 AND ${table.trade_fee_bps} <= 1000`),
  affiliateShareCheck: check('orders_affiliate_share_bps_check', sql`${table.affiliate_share_bps} >= 0 AND ${table.affiliate_share_bps} <= 10000`),
})).enableRLS()
