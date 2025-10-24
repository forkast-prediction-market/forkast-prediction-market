import { sql } from 'drizzle-orm'
import { char, index, pgPolicy, pgTable, primaryKey } from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'
import { events } from '@/lib/db/schema/events/tables'

export const bookmarks = pgTable(
  'bookmarks',
  {
    user_id: char('user_id', { length: 26 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    event_id: char('event_id', { length: 26 })
      .notNull()
      .references(() => events.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  },
  table => ({
    // Primary key (composite index for user_id and event_id)
    pk: primaryKey({ columns: [table.user_id, table.event_id] }),

    // Performance-critical indexes
    eventIdIdx: index('idx_bookmarks_event_id').on(table.event_id),

    // RLS Policy for bookmark access control
    serviceRolePolicy: pgPolicy('service_role_all_bookmarks', {
      as: 'permissive',
      to: 'service_role',
      for: 'all',
      using: sql`TRUE`,
      withCheck: sql`TRUE`,
    }),
  }),
).enableRLS()
