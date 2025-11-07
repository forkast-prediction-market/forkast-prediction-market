import { sql } from 'drizzle-orm'
import {
  bigint,
  numeric,
  pgTable,
  pgView,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'
import { conditions } from '@/lib/db/schema/events/tables'

export const orders = pgTable('orders', {
  id: text().primaryKey().default(sql`generate_ulid()`),

  // begin blockchain data
  salt: bigint({ mode: 'bigint' }),
  maker: text().notNull(),
  signer: text().notNull(),
  taker: text().notNull(),
  referrer: text().notNull(),
  affiliate: text(),
  token_id: text().notNull(),
  maker_amount: bigint({ mode: 'bigint' }),
  taker_amount: bigint({ mode: 'bigint' }),
  expiration: bigint({ mode: 'bigint' }).notNull(),
  nonce: bigint({ mode: 'bigint' }),
  fee_rate_bps: smallint().notNull(),
  affiliate_percentage: smallint(),
  side: smallint().notNull(),
  signature_type: smallint().notNull(),
  signature: text(),
  // end blockchain data

  user_id: text().notNull().references(() => users.id, { onDelete: 'cascade' }),
  condition_id: text().notNull().references(() => conditions.id),
  type: text().notNull(),
  status: text().notNull().default('live'),
  affiliate_user_id: text().references(() => users.id),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export const v_user_outcome_positions = pgView('v_user_outcome_positions', {
  user_id: text(),
  condition_id: text(),
  token_id: text(),
  outcome_index: smallint(),
  outcome_text: text(),
  net_shares_micro: numeric(),
  total_cost_micro: numeric(),
  total_proceeds_micro: numeric(),
  order_count: bigint({ mode: 'bigint' }),
  last_activity_at: timestamp({ withTimezone: true }),
}).existing()
