import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  integer,
  numeric,
  pgTable,
  pgView,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

// Conditions table - Primary entity from Activity/PnL subgraphs
export const conditions = pgTable(
  'conditions',
  {
    id: text().primaryKey(),
    oracle: text().notNull(),
    question_id: text().notNull(),
    resolved: boolean().default(false),
    arweave_hash: text(),
    creator: char('creator', { length: 42 }),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
)

export const events = pgTable(
  'events',
  {
    id: char({ length: 26 })
      .primaryKey()
      .default(sql`generate_ulid()`),
    slug: text()
      .notNull()
      .unique(),
    title: text()
      .notNull(),
    creator: char({ length: 42 }),
    icon_url: text(),
    show_market_icons: boolean()
      .default(true),
    status: text()
      .notNull()
      .default('active'),
    rules: text(),
    active_markets_count: integer()
      .default(0),
    total_markets_count: integer()
      .default(0),
    created_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow(),
    end_date: timestamp({ withTimezone: true }),
  },
)

// Markets table - Core trading markets (belongs to events)
export const markets = pgTable(
  'markets',
  {
    condition_id: text()
      .primaryKey()
      .references(() => conditions.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    event_id: char({ length: 26 })
      .notNull()
      .references(() => events.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    title: text().notNull(),
    slug: text().notNull(),
    short_title: text(),
    question: text(),
    market_rules: text(),
    resolution_source: text(),
    resolution_source_url: text(),
    resolver: char({ length: 42 }),
    neg_risk: boolean().default(false).notNull(),
    neg_risk_market_id: char({ length: 66 }),
    neg_risk_request_id: char({ length: 66 }),
    metadata_version: text(),
    metadata_schema: text(),
    icon_url: text(),
    is_active: boolean().default(true).notNull(),
    is_resolved: boolean().default(false).notNull(),
    metadata: text(), // JSONB as text
    volume_24h: numeric({ precision: 20, scale: 6 }).default('0').notNull(),
    volume: numeric({ precision: 20, scale: 6 }).default('0').notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
)

// Outcomes table - Individual market outcomes (belongs to markets via condition_id)
export const outcomes = pgTable(
  'outcomes',
  {
    id: char({ length: 26 }).primaryKey().default(sql`generate_ulid()`),
    condition_id: text()
      .notNull()
      .references(() => conditions.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    outcome_text: text().notNull(),
    outcome_index: smallint().notNull(),
    token_id: text().notNull().unique(),
    is_winning_outcome: boolean().default(false),
    payout_value: numeric({ precision: 20, scale: 6 }),
    current_price: numeric({ precision: 8, scale: 4 }),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
)

// Tags table - Hierarchical categorization system for events
export const tags = pgTable(
  'tags',
  {
    id: smallint().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull().unique(),
    slug: text().notNull().unique(),
    is_main_category: boolean().default(false),
    is_hidden: boolean().notNull().default(false),
    hide_events: boolean().notNull().default(false),
    display_order: smallint().default(0),
    parent_tag_id: smallint().references((): any => tags.id),
    active_markets_count: integer().default(0),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
)

// Event-Tag relationship table - Many-to-many between events and tags
export const event_tags = pgTable(
  'event_tags',
  {
    event_id: char({ length: 26 })
      .notNull()
      .references(() => events.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    tag_id: smallint()
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  },
)

export const v_main_tag_subcategories = pgView(
  'v_main_tag_subcategories',
  {
    main_tag_id: integer(),
    main_tag_slug: text(),
    main_tag_name: text(),
    main_tag_is_hidden: boolean(),
    sub_tag_id: integer(),
    sub_tag_name: text(),
    sub_tag_slug: text(),
    sub_tag_is_main_category: boolean(),
    sub_tag_is_hidden: boolean(),
    active_markets_count: integer(),
    last_market_activity_at: timestamp(),
  },
).existing()
