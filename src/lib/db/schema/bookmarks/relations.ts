import { relations } from 'drizzle-orm'
import { users } from '../auth/tables'
import { events } from '../events/tables'
import { bookmarks } from './tables'

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

export const eventsBookmarksRelations = relations(events, ({ many }) => ({
  bookmarks: many(bookmarks),
}))
