import { relations, sql } from 'drizzle-orm'
import {
  char,
  index,
  pgPolicy,
  pgTable,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './auth'

export const affiliate_referrals = pgTable(
  'affiliate_referrals',
  {
    id: char('id', { length: 26 })
      .primaryKey()
      .default(sql`generate_ulid()`),
    user_id: char('user_id', { length: 26 })
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    affiliate_user_id: char('affiliate_user_id', { length: 26 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => ({
    // Performance-critical indexes for affiliate queries
    userIdIdx: index('idx_affiliate_referrals_user_id').on(table.user_id),
    affiliateUserIdIdx: index('idx_affiliate_referrals_affiliate_user_id').on(table.affiliate_user_id),
    createdAtIdx: index('idx_affiliate_referrals_created_at').on(table.created_at),

    // RLS Policy for affiliate data security
    serviceRolePolicy: pgPolicy('service_role_all_affiliate_referrals', {
      as: 'permissive',
      to: 'service_role',
      for: 'all',
      using: sql`TRUE`,
      withCheck: sql`TRUE`,
    }),
  }),
).enableRLS()

export const affiliateReferralsRelations = relations(affiliate_referrals, ({ one }) => ({
  user: one(users, {
    fields: [affiliate_referrals.user_id],
    references: [users.id],
    relationName: 'user_referrals',
  }),
  affiliateUser: one(users, {
    fields: [affiliate_referrals.affiliate_user_id],
    references: [users.id],
    relationName: 'affiliate_referrals',
  }),
}))

export const usersAffiliateRelations = relations(users, ({ many }) => ({
  referrals: many(affiliate_referrals, { relationName: 'user_referrals' }),
  affiliateReferrals: many(affiliate_referrals, { relationName: 'affiliate_referrals' }),
}))
