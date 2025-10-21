import { char, pgTable, primaryKey } from 'drizzle-orm/pg-core'
import { events, users } from '.'

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
