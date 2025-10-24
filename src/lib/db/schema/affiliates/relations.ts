import { relations } from 'drizzle-orm'
import { affiliate_referrals, users } from '@/lib/db/schema'

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
