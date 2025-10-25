import { sql } from 'drizzle-orm'
import {
  bigint,
  check,
  index,
  integer,
  numeric,
  pgPolicy,
  pgTable,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'
import { conditions, outcomes } from '@/lib/db/schema/events/tables'

export const orders = pgTable('orders', {
  id: text('id').primaryKey().default(sql`generate_ulid()`),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  condition_id: text('condition_id')
    .notNull()
    .references(() => conditions.id),
  token_id: text('token_id')
    .notNull()
    .references(() => outcomes.token_id),
  type: smallint('type').notNull(),
  side: smallint('side').notNull(),
  price: bigint({ mode: 'bigint' }),
  share: bigint({ mode: 'bigint' }),
  maker_amount: bigint({ mode: 'bigint' }),
  status: text('status').notNull().default('open'),
  maker_address: text().notNull(),
  taker_address: text().notNull(),
  signer_address: text(),
  salt: numeric({ precision: 78, scale: 0 }),
  expiration: timestamp('expiration', { withTimezone: true }),
  nonce: bigint({ mode: 'bigint' }),
  fee_rate_bps: integer().notNull(),
  referrer: text().notNull(),
  affiliate: text(),
  affiliate_percentage: integer(),
  signature_type: smallint().default(0),
  signature: text(),
  affiliate_user_id: text('affiliate_user_id').references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => ({
  // Performance indexes
  idxOrdersUserId: index('idx_orders_user_id').on(table.user_id),
  idxOrdersCondition: index('idx_orders_condition_id').on(table.condition_id, table.token_id),
  idxOrdersStatus: index('idx_orders_status').on(table.status),
  idxOrdersCreatedAt: index('idx_orders_created_at').using('brin', table.created_at),

  // RLS policies
  serviceRoleAllOrders: pgPolicy('service_role_all_orders', {
    as: 'permissive',
    to: 'service_role',
    for: 'all',
    using: sql`TRUE`,
    withCheck: sql`TRUE`,
  }),

  // Check constraints
  typeCheck: check('orders_type_check', sql`${table.type} IN (0, 1)`),
  sideCheck: check('orders_side_check', sql`${table.side} IN (0, 1)`),
  statusCheck: check('orders_status_check', sql`${table.status} IN ('open', 'filled', 'cancelled')`),
})).enableRLS()
