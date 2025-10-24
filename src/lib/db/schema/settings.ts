import { sql } from 'drizzle-orm'
import { index, pgPolicy, pgTable, smallint, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const settings = pgTable(
  'settings',
  {
    id: smallint('id').primaryKey().generatedAlwaysAsIdentity(),
    group: text('group').notNull(),
    key: text('key').notNull(),
    value: text('value').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Unique index for group and key combination
    groupKeyUniqueIdx: uniqueIndex('idx_settings_group_key_unique').on(table.group, table.key),

    // Performance indexes
    groupIdx: index('idx_settings_group').on(table.group),
    keyIdx: index('idx_settings_key').on(table.key),

    // RLS Policy for settings access
    serviceRolePolicy: pgPolicy('service_role_all_settings', {
      as: 'permissive',
      to: 'service_role',
      for: 'all',
      using: sql`TRUE`,
      withCheck: sql`TRUE`,
    }),
  }),
).enableRLS()
