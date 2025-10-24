import { relations } from 'drizzle-orm'
import { bookmarks } from '@/lib/db/schema/bookmarks/tables'
import { comment_likes, comment_reports, comments } from '@/lib/db/schema/comments/tables'
import { notifications } from '@/lib/db/schema/notifications/tables'
import { orders } from '@/lib/db/schema/orders/tables'
import { accounts, sessions, two_factors, users, wallets } from './tables'

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  wallets: many(wallets),
  twoFactors: many(two_factors),
  bookmarks: many(bookmarks),
  orders: many(orders),
  comments: many(comments),
  commentLikes: many(comment_likes),
  commentReports: many(comment_reports),
  notifications: many(notifications),
  referredByUser: one(users, {
    fields: [users.referred_by_user_id],
    references: [users.id],
    relationName: 'user_referrals',
  }),
  referredUsers: many(users, {
    relationName: 'user_referrals',
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.user_id],
    references: [users.id],
  }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.user_id],
    references: [users.id],
  }),
}))

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, {
    fields: [wallets.user_id],
    references: [users.id],
  }),
}))

export const twoFactorsRelations = relations(two_factors, ({ one }) => ({
  user: one(users, {
    fields: [two_factors.user_id],
    references: [users.id],
  }),
}))
