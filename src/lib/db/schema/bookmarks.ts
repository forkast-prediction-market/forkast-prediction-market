import { relations, sql } from 'drizzle-orm'
import { char, index, pgPolicy, pgTable, primaryKey } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { events } from './events'

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
    userIdIdx: index('idx_bookmarks_user_id').on(table.user_id),
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

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  event: one(events, {
    fields: [bookmarks.event_id],
    references: [events.id],
  }),
  user: one(users, {
    fields: [bookmarks.user_id],
    references: [users.id],
  }),
}))
