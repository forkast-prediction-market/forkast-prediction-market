import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  integer,
  jsonb,
  pgTable,
  pgView,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'
import { events } from '@/lib/db/schema/events/tables'

export const comments = pgTable(
  'comments',
  {
    id: char({ length: 26 })
      .primaryKey()
      .default(sql`generate_ulid()`),
    event_id: char({ length: 26 })
      .notNull()
      .references(() => events.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    user_id: char({ length: 26 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    parent_comment_id: char({ length: 26 })
      .references((): any => comments.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    content: text()
      .notNull(),
    is_deleted: boolean()
      .default(false),
    likes_count: integer()
      .default(0),
    replies_count: integer()
      .default(0),
    created_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow(),
  },
)

export const comment_likes = pgTable(
  'comment_likes',
  {
    comment_id: char({ length: 26 })
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    user_id: char({ length: 26 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  },
)

export const comment_reports = pgTable(
  'comment_reports',
  {
    id: char({ length: 26 })
      .primaryKey()
      .default(sql`generate_ulid()`),
    comment_id: char({ length: 26 })
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    reporter_user_id: char('reporter_user_id', { length: 26 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    reason: text('reason')
      .notNull(),
    description: text('description'),
    status: text()
      .default('pending'),
    reviewed_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow(),
  },
)

export const v_comments_with_user = pgView('v_comments_with_user', {
  id: char({ length: 26 }),
  event_id: char({ length: 26 }),
  user_id: char({ length: 26 }),
  parent_comment_id: char({ length: 26 }),
  content: text(),
  is_deleted: boolean(),
  likes_count: integer(),
  replies_count: integer(),
  created_at: timestamp({ withTimezone: true }),
  updated_at: timestamp({ withTimezone: true }),
  username: text(),
  user_avatar: text(),
  user_address: char({ length: 42 }),
  recent_replies: jsonb(),
}).existing()
