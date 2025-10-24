import { sql } from 'drizzle-orm'
import { char, check, index, jsonb, pgPolicy, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'

export const notifications = pgTable(
  'notifications',
  {
    id: char('id', { length: 26 })
      .primaryKey()
      .default(sql`generate_ulid()`),
    user_id: char('user_id', { length: 26 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    category: text('category')
      .notNull(),
    title: text('title')
      .notNull(),
    description: text('description')
      .notNull(),
    extra_info: text('extra_info'),
    metadata: jsonb('metadata')
      .notNull()
      .default(sql`'{}'::JSONB`),
    link_type: text('link_type')
      .notNull()
      .default('none'),
    link_target: text('link_target'),
    link_url: text('link_url'),
    link_label: text('link_label'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => ({
    // Performance-critical indexes for notification queries
    userIdIdx: index('idx_notifications_user_id').on(table.user_id),
    categoryIdx: index('idx_notifications_category').on(table.category),
    createdAtIdx: index('idx_notifications_created_at').on(table.created_at),
    userCreatedAtIdx: index('idx_notifications_user_created_at').on(table.user_id, table.created_at),
    userCategoryIdx: index('idx_notifications_user_category').on(table.user_id, table.category),

    // RLS Policy for notification privacy
    serviceRolePolicy: pgPolicy('service_role_all_notifications', {
      as: 'permissive',
      to: 'service_role',
      for: 'all',
      using: sql`TRUE`,
      withCheck: sql`TRUE`,
    }),

    // Check constraints for notification categories and link validations
    category_check: check(
      'category_check',
      sql`${table.category} IN ('trade', 'system', 'general')`,
    ),
    linkTypeCheck: check(
      'link_type_check',
      sql`${table.link_type} IN ('none', 'market', 'event', 'order', 'settings', 'profile', 'external', 'custom')`,
    ),
    linkUrlLengthCheck: check(
      'link_url_length_check',
      sql`${table.link_url} IS NULL OR CHAR_LENGTH(${table.link_url}) <= 2048`,
    ),
    externalLinkCheck: check(
      'external_link_check',
      sql`${table.link_type} <> 'external' OR ${table.link_url} IS NOT NULL`,
    ),
    linkTargetCheck: check(
      'link_target_check',
      sql`${table.link_type} NOT IN ('market', 'event', 'order', 'settings', 'profile') OR ${table.link_target} IS NOT NULL`,
    ),
  }),
).enableRLS()
