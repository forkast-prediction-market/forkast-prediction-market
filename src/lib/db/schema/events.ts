import { relations, sql } from 'drizzle-orm'
import { boolean, char, check, integer, pgTable, pgView, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { bookmarks } from './bookmarks'
import { comments } from './comments'
import { markets } from './orders'
import { event_tags } from './tags'

export const events = pgTable(
  'events',
  {
    id: char('id', { length: 26 })
      .primaryKey()
      .default(sql`generate_ulid()`),
    slug: varchar('slug', { length: 255 })
      .notNull()
      .unique(),
    title: text('title')
      .notNull(),
    creator: varchar('creator', { length: 42 }),
    icon_url: text('icon_url'),
    show_market_icons: boolean('show_market_icons')
      .default(true),
    status: varchar('status', { length: 20 })
      .notNull()
      .default('active'),
    rules: text('rules'),
    active_markets_count: integer('active_markets_count')
      .default(0),
    total_markets_count: integer('total_markets_count')
      .default(0),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    end_date: timestamp('end_date', { withTimezone: true }),
  },
  table => ({
    statusCheck: check(
      'status_check',
      sql`${table.status} IN ('draft', 'active', 'archived')`,
    ),
  }),
)

export const vVisibleEvents = pgView('v_visible_events', {
  id: char('id', { length: 26 }),
  slug: varchar('slug', { length: 255 }),
  title: text('title'),
  creator: varchar('creator', { length: 42 }),
  icon_url: text('icon_url'),
  show_market_icons: boolean('show_market_icons'),
  status: varchar('status', { length: 20 }),
  rules: text('rules'),
  active_markets_count: integer('active_markets_count'),
  total_markets_count: integer('total_markets_count'),
  created_at: timestamp('created_at', { withTimezone: true }),
  updated_at: timestamp('updated_at', { withTimezone: true }),
}).existing()

export const eventsRelations = relations(events, ({ many }) => ({
  markets: many(markets),
  eventTags: many(event_tags),
  bookmarks: many(bookmarks),
  comments: many(comments),
}))
