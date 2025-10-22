import { relations } from 'drizzle-orm'
import { boolean, char, integer, pgTable, pgView, primaryKey, smallint, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { events } from './events'

export const tags = pgTable('tags', {
  id: smallint('id')
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 })
    .notNull()
    .unique(),
  slug: varchar('slug', { length: 100 })
    .notNull()
    .unique(),
  is_main_category: boolean('is_main_category')
    .default(false),
  is_hidden: boolean('is_hidden')
    .notNull()
    .default(false),
  hide_events: boolean('hide_events')
    .notNull()
    .default(false),
  display_order: smallint('display_order')
    .default(0),
  parent_tag_id: smallint('parent_tag_id')
    .references((): any => tags.id),
  active_markets_count: integer('active_markets_count')
    .default(0),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const event_tags = pgTable(
  'event_tags',
  {
    event_id: char('event_id', { length: 26 })
      .notNull()
      .references(() => events.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    tag_id: smallint('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  },
  table => ({
    pk: primaryKey({ columns: [table.event_id, table.tag_id] }),
  }),
)

export const v_main_tag_subcategories = pgView(
  'v_main_tag_subcategories',
  {
    main_tag_id: integer('main_tag_id'),
    main_tag_slug: text('main_tag_slug'),
    main_tag_name: text('main_tag_name'),
    main_tag_is_hidden: boolean('main_tag_is_hidden'),
    sub_tag_id: integer('sub_tag_id'),
    sub_tag_name: text('sub_tag_name'),
    sub_tag_slug: text('sub_tag_slug'),
    sub_tag_is_main_category: boolean('sub_tag_is_main_category'),
    sub_tag_is_hidden: boolean('sub_tag_is_hidden'),
    active_markets_count: integer('active_markets_count'),
    last_market_activity_at: timestamp('last_market_activity_at'),
  },
).existing()

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
