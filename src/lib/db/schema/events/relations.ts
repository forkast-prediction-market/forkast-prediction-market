import { relations } from 'drizzle-orm'
import { conditions, event_tags, events, markets, outcome_recent_trades, outcomes, tags } from './tables'

export const conditionsRelations = relations(conditions, ({ many }) => ({
  markets: many(markets),
  outcomes: many(outcomes),
}))

export const eventsRelations = relations(events, ({ many }) => ({
  markets: many(markets),
  eventTags: many(event_tags),
}))

export const marketsRelations = relations(markets, ({ one, many }) => ({
  event: one(events, {
    fields: [markets.event_id],
    references: [events.id],
  }),
  condition: one(conditions, {
    fields: [markets.condition_id],
    references: [conditions.id],
  }),
  outcomes: many(outcomes),
}))

export const outcomesRelations = relations(outcomes, ({ one, many }) => ({
  condition: one(conditions, {
    fields: [outcomes.condition_id],
    references: [conditions.id],
  }),
  recentTrades: many(outcome_recent_trades),
}))

export const tagsRelations = relations(tags, ({ many, one }) => ({
  eventTags: many(event_tags),
  parentTag: one(tags, {
    fields: [tags.parent_tag_id],
    references: [tags.id],
    relationName: 'parent_child',
  }),
  childTags: many(tags, {
    relationName: 'parent_child',
  }),
}))

export const eventTagsRelations = relations(event_tags, ({ one }) => ({
  event: one(events, {
    fields: [event_tags.event_id],
    references: [events.id],
  }),
  tag: one(tags, {
    fields: [event_tags.tag_id],
    references: [tags.id],
  }),
}))

export const outcomeRecentTradesRelations = relations(outcome_recent_trades, ({ one }) => ({
  outcome: one(outcomes, {
    fields: [outcome_recent_trades.token_id],
    references: [outcomes.token_id],
  }),
}))
