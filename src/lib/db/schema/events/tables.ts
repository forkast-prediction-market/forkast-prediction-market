import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  check,
  index,
  integer,
  numeric,
  pgPolicy,
  pgTable,
  pgView,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

// Conditions table - Primary entity from Activity/PnL subgraphs
export const conditions = pgTable(
  'conditions',
  {
    id: char('id', { length: 66 }).primaryKey(),
    oracle: char('oracle', { length: 42 }).notNull(),
    question_id: char('question_id', { length: 66 }).notNull(),
    resolved: boolean('resolved').default(false),
    arweave_hash: text('arweave_hash'),
    creator: char('creator', { length: 42 }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    // Indexes for performance
    oracleIdx: index('idx_conditions_oracle').on(table.oracle),
    questionIdIdx: index('idx_conditions_question_id').on(table.question_id),
    resolvedIdx: index('idx_conditions_resolved').on(table.resolved),
    creatorIdx: index('idx_conditions_creator').on(table.creator),
    createdAtIdx: index('idx_conditions_created_at').on(table.created_at),
    // RLS Policy
    serviceRolePolicy: pgPolicy('service_role_all_conditions', {
      as: 'permissive',
      to: 'service_role',
      for: 'all',
      using: sql`TRUE`,
      withCheck: sql`TRUE`,
    }),
  }),
).enableRLS()

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
    // Performance-critical indexes
    statusIdx: index('idx_events_status').on(table.status),
    creatorIdx: index('idx_events_creator').on(table.creator),
    createdAtIdx: index('idx_events_created_at').on(table.created_at),
    endDateIdx: index('idx_events_end_date').on(table.end_date),
    activeMarketsCountIdx: index('idx_events_active_markets_count').on(table.active_markets_count),
    titleIdx: index('idx_events_title').using('gin', table.title.op('gin_trgm_ops')),
    // Unique indexes
    slugUniqueIdx: uniqueIndex('idx_events_slug_unique').on(table.slug),
    // RLS Policy
    serviceRolePolicy: pgPolicy('service_role_all_events', {
      as: 'permissive',
      to: 'service_role',
      for: 'all',
      using: sql`TRUE`,
      withCheck: sql`TRUE`,
    }),
    // Check constraints
    statusCheck: check(
      'status_check',
      sql`${table.status} IN ('draft', 'active', 'archived')`,
    ),
    activeMarketsCountCheck: check(
      'active_markets_count_check',
      sql`${table.active_markets_count} >= 0`,
    ),
    totalMarketsCountCheck: check(
      'total_markets_count_check',
      sql`${table.total_markets_count} >= 0`,
    ),
  }),
).enableRLS()

// Markets table - Core trading markets (belongs to events)
export const markets = pgTable(
  'markets',
  {
    condition_id: varchar('condition_id', { length: 66 })
      .primaryKey()
      .references(() => conditions.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    event_id: char('event_id', { length: 26 })
      .notNull()
      .references(() => events.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    title: text('title').notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    short_title: varchar('short_title', { length: 50 }),
    icon_url: text('icon_url'),
    is_active: boolean('is_active').default(true).notNull(),
    is_resolved: boolean('is_resolved').default(false).notNull(),
    metadata: text('metadata'), // JSONB as text
    current_volume_24h: numeric('current_volume_24h', { precision: 20, scale: 6 }).default('0').notNull(),
    total_volume: numeric('total_volume', { precision: 20, scale: 6 }).default('0').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    // Performance-critical indexes
    eventIdIdx: index('idx_markets_event_id').on(table.event_id),
    isActiveIdx: index('idx_markets_is_active').on(table.is_active),
    isResolvedIdx: index('idx_markets_is_resolved').on(table.is_resolved),
    createdAtIdx: index('idx_markets_created_at').on(table.created_at),
    currentVolume24hIdx: index('idx_markets_current_volume_24h').on(table.current_volume_24h),
    totalVolumeIdx: index('idx_markets_total_volume').on(table.total_volume),
    // Composite indexes for common queries
    eventActiveResolvedIdx: index('idx_markets_event_active_resolved').on(table.event_id, table.is_active, table.is_resolved),
    // Unique indexes
    eventSlugUniqueIdx: uniqueIndex('idx_markets_event_slug_unique').on(table.event_id, table.slug),
    // RLS Policy
    serviceRolePolicy: pgPolicy('service_role_all_markets', {
      as: 'permissive',
      to: 'service_role',
      for: 'all',
      using: sql`TRUE`,
      withCheck: sql`TRUE`,
    }),
    // Check constraints
    currentVolume24hCheck: check(
      'current_volume_24h_check',
      sql`${table.current_volume_24h} >= 0`,
    ),
    totalVolumeCheck: check(
      'total_volume_check',
      sql`${table.total_volume} >= 0`,
    ),
  }),
).enableRLS()

// Outcomes table - Individual market outcomes (belongs to markets via condition_id)
export const outcomes = pgTable(
  'outcomes',
  {
    id: char('id', { length: 26 }).primaryKey().default(sql`generate_ulid()`),
    condition_id: char('condition_id', { length: 66 })
      .notNull()
      .references(() => conditions.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    outcome_text: text('outcome_text').notNull(),
    outcome_index: smallint('outcome_index').notNull(),
    token_id: text('token_id').notNull().unique(),
    is_winning_outcome: boolean('is_winning_outcome').default(false),
    payout_value: numeric('payout_value', { precision: 20, scale: 6 }),
    current_price: numeric('current_price', { precision: 8, scale: 4 }),
    volume_24h: numeric('volume_24h', { precision: 20, scale: 6 }).default('0').notNull(),
    total_volume: numeric('total_volume', { precision: 20, scale: 6 }).default('0').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    // Performance-critical indexes
    conditionIdIdx: index('idx_outcomes_condition_id').on(table.condition_id),
    outcomeIndexIdx: index('idx_outcomes_outcome_index').on(table.outcome_index),
    isWinningOutcomeIdx: index('idx_outcomes_is_winning_outcome').on(table.is_winning_outcome),
    currentPriceIdx: index('idx_outcomes_current_price').on(table.current_price),
    volume24hIdx: index('idx_outcomes_volume_24h').on(table.volume_24h),
    totalVolumeIdx: index('idx_outcomes_total_volume').on(table.total_volume),
    createdAtIdx: index('idx_outcomes_created_at').on(table.created_at),
    // Composite indexes
    conditionOutcomeIndexIdx: index('idx_outcomes_condition_outcome_index').on(table.condition_id, table.outcome_index),
    // Unique indexes
    tokenIdUniqueIdx: uniqueIndex('idx_outcomes_token_id_unique').on(table.token_id),
    conditionOutcomeIndexUniqueIdx: uniqueIndex('idx_outcomes_condition_outcome_index_unique').on(table.condition_id, table.outcome_index),
    // RLS Policy
    serviceRolePolicy: pgPolicy('service_role_all_outcomes', {
      as: 'permissive',
      to: 'service_role',
      for: 'all',
      using: sql`TRUE`,
      withCheck: sql`TRUE`,
    }),
    // Check constraints
    outcomeIndexCheck: check(
      'outcome_index_check',
      sql`${table.outcome_index} >= 0`,
    ),
    currentPriceCheck: check(
      'current_price_check',
      sql`${table.current_price} IS NULL OR (${table.current_price} >= 0.0001 AND ${table.current_price} <= 0.9999)`,
    ),
    volume24hCheck: check(
      'volume_24h_check',
      sql`${table.volume_24h} >= 0`,
    ),
    totalVolumeCheck: check(
      'total_volume_check',
      sql`${table.total_volume} >= 0`,
    ),
    payoutValueCheck: check(
      'payout_value_check',
      sql`${table.payout_value} IS NULL OR ${table.payout_value} >= 0`,
    ),
  }),
).enableRLS()

// Tags table - Hierarchical categorization system for events
export const tags = pgTable(
  'tags',
  {
    id: smallint('id').primaryKey().generatedAlwaysAsIdentity(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    is_main_category: boolean('is_main_category').default(false),
    is_hidden: boolean('is_hidden').notNull().default(false),
    hide_events: boolean('hide_events').notNull().default(false),
    display_order: smallint('display_order').default(0),
    parent_tag_id: smallint('parent_tag_id')
      .references((): any => tags.id),
    active_markets_count: integer('active_markets_count').default(0),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // Performance-critical indexes
    nameIdx: index('idx_tags_name').on(table.name),
    slugIdx: index('idx_tags_slug').on(table.slug),
    isMainCategoryIdx: index('idx_tags_is_main_category').on(table.is_main_category),
    isHiddenIdx: index('idx_tags_is_hidden').on(table.is_hidden),
    hideEventsIdx: index('idx_tags_hide_events').on(table.hide_events),
    displayOrderIdx: index('idx_tags_display_order').on(table.display_order),
    parentTagIdIdx: index('idx_tags_parent_tag_id').on(table.parent_tag_id),
    activeMarketsCountIdx: index('idx_tags_active_markets_count').on(table.active_markets_count),
    createdAtIdx: index('idx_tags_created_at').on(table.created_at),
    // Unique indexes
    nameUniqueIdx: uniqueIndex('idx_tags_name_unique').on(table.name),
    slugUniqueIdx: uniqueIndex('idx_tags_slug_unique').on(table.slug),
    // RLS Policy
    serviceRolePolicy: pgPolicy('service_role_all_tags', {
      as: 'permissive',
      to: 'service_role',
      for: 'all',
      using: sql`TRUE`,
      withCheck: sql`TRUE`,
    }),
    // Check constraints
    activeMarketsCountCheck: check(
      'active_markets_count_check',
      sql`${table.active_markets_count} >= 0`,
    ),
    displayOrderCheck: check(
      'display_order_check',
      sql`${table.display_order} >= 0`,
    ),
  }),
).enableRLS()

// Event-Tag relationship table - Many-to-many between events and tags
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
    // Primary key
    pk: primaryKey({ columns: [table.event_id, table.tag_id] }),
    // Performance-critical indexes
    eventIdIdx: index('idx_event_tags_event_id').on(table.event_id),
    tagIdIdx: index('idx_event_tags_tag_id').on(table.tag_id),
    // RLS Policy
    serviceRolePolicy: pgPolicy('service_role_all_event_tags', {
      as: 'permissive',
      to: 'service_role',
      for: 'all',
      using: sql`TRUE`,
      withCheck: sql`TRUE`,
    }),
  }),
).enableRLS()

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
).as(sql`
  SELECT
    main_tag.id AS main_tag_id,
    main_tag.slug AS main_tag_slug,
    main_tag.name AS main_tag_name,
    main_tag.is_hidden AS main_tag_is_hidden,
    sub_tag.id AS sub_tag_id,
    sub_tag.name AS sub_tag_name,
    sub_tag.slug AS sub_tag_slug,
    sub_tag.is_main_category AS sub_tag_is_main_category,
    sub_tag.is_hidden AS sub_tag_is_hidden,
    COUNT(DISTINCT m.condition_id) AS active_markets_count,
    MAX(m.updated_at) AS last_market_activity_at
  FROM ${tags} AS main_tag
  JOIN ${event_tags} AS et_main ON et_main.tag_id = main_tag.id
  JOIN ${markets} AS m ON m.event_id = et_main.event_id
  JOIN ${event_tags} AS et_sub ON et_sub.event_id = et_main.event_id
  JOIN ${tags} AS sub_tag ON sub_tag.id = et_sub.tag_id
  WHERE main_tag.is_main_category = TRUE
    AND main_tag.is_hidden = FALSE
    AND m.is_active = TRUE
    AND m.is_resolved = FALSE
    AND sub_tag.id <> main_tag.id
    AND sub_tag.is_main_category = FALSE
    AND sub_tag.is_hidden = FALSE
  GROUP BY
    main_tag.id,
    main_tag.slug,
    main_tag.name,
    main_tag.is_hidden,
    sub_tag.id,
    sub_tag.name,
    sub_tag.slug,
    sub_tag.is_main_category,
    sub_tag.is_hidden
`)
