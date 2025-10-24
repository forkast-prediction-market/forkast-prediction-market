import { relations } from 'drizzle-orm'
import { bookmarks, events, users } from '@/lib/db/schema'

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
