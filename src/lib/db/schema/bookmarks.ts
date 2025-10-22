import { relations } from 'drizzle-orm'
import { char, pgTable, primaryKey } from 'drizzle-orm/pg-core'
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
    pk: primaryKey({ columns: [table.user_id, table.event_id] }),
  }),
)

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
