import { relations } from 'drizzle-orm'
import {
  accounts,
  bookmarks,
  comment_likes,
  comment_reports,
  comments,
  notifications,
  orders,
  sessions,
  two_factors,
  users,
  wallets,
} from '@/lib/db/schema'

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
