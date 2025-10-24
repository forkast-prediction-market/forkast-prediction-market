import { relations } from 'drizzle-orm'
import { notifications, users } from '@/lib/db/schema'

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.user_id],
    references: [users.id],
  }),
}))
