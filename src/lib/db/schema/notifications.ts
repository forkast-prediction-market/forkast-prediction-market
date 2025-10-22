import { relations, sql } from 'drizzle-orm'
import { char, check, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './auth'

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
)

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.user_id],
    references: [users.id],
  }),
}))
