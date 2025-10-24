import { relations } from 'drizzle-orm'
import { users } from '../auth/tables'
import { conditions, outcomes } from '../events/tables'
import { orders } from './tables'

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.user_id],
    references: [users.id],
  }),
  outcome: one(outcomes, {
    fields: [orders.token_id],
    references: [outcomes.token_id],
  }),
  condition: one(conditions, {
    fields: [orders.condition_id],
    references: [conditions.id],
  }),
}))
