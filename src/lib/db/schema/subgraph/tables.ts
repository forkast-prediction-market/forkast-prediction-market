import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgPolicy,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const subgraph_syncs = pgTable(
  'subgraph_syncs',
  {
    id: smallint('id').primaryKey().generatedAlwaysAsIdentity(),
    service_name: varchar('service_name', { length: 50 }).notNull(),
    subgraph_name: varchar('subgraph_name', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).default('idle').notNull(),
    total_processed: integer('total_processed').default(0).notNull(),
    error_message: text('error_message'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    // Performance-critical indexes
    serviceNameIdx: index('idx_subgraph_syncs_service_name').on(table.service_name),
    subgraphNameIdx: index('idx_subgraph_syncs_subgraph_name').on(table.subgraph_name),
    statusIdx: index('idx_subgraph_syncs_status').on(table.status),
    createdAtIdx: index('idx_subgraph_syncs_created_at').on(table.created_at),
    updatedAtIdx: index('idx_subgraph_syncs_updated_at').on(table.updated_at),
    // Unique composite index
    serviceSubgraphUniqueIdx: uniqueIndex('idx_subgraph_syncs_service_subgraph_unique').on(table.service_name, table.subgraph_name),
    // RLS Policy
    serviceRolePolicy: pgPolicy('service_role_all_subgraph_syncs', {
      as: 'permissive',
      to: 'service_role',
      for: 'all',
      using: sql`TRUE`,
      withCheck: sql`TRUE`,
    }),
    // Check constraints
    statusCheck: check(
      'status_check',
      sql`${table.status} IN ('idle', 'running', 'completed', 'error')`,
    ),
    totalProcessedCheck: check(
      'total_processed_check',
      sql`${table.total_processed} >= 0`,
    ),
  }),
).enableRLS()
