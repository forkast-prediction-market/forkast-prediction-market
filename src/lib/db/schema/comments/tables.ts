import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  pgView,
  primaryKey,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'
import { events } from '@/lib/db/schema/events/tables'

export const comments = pgTable(
  'comments',
  {
    id: char('id', { length: 26 })
      .primaryKey()
      .default(sql`generate_ulid()`),
    event_id: char('event_id', { length: 26 })
      .notNull()
      .references(() => events.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    user_id: char('user_id', { length: 26 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    parent_comment_id: char('parent_comment_id', { length: 26 })
      .references((): any => comments.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    content: text('content')
      .notNull(),
    is_deleted: boolean('is_deleted')
      .default(false),
    likes_count: integer('likes_count')
      .default(0),
    replies_count: integer('replies_count')
      .default(0),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => ({
    // Performance-critical indexes
    eventIdIdx: index('idx_comments_event_id').on(table.event_id),
    userIdIdx: index('idx_comments_user_id').on(table.user_id),
    parentCommentIdIdx: index('idx_comments_parent_comment_id').on(table.parent_comment_id),
    isDeletedIdx: index('idx_comments_is_deleted').on(table.is_deleted),
    createdAtIdx: index('idx_comments_created_at').on(table.created_at),
    // Composite indexes for common query patterns
    eventParentIdx: index('idx_comments_event_parent').on(table.event_id, table.parent_comment_id),
    eventDeletedCreatedIdx: index('idx_comments_event_deleted_created').on(table.event_id, table.is_deleted, table.created_at),
    // RLS Policy
    serviceRolePolicy: pgPolicy('service_role_all_comments', {
      as: 'permissive',
      to: 'service_role',
      for: 'all',
      using: sql`TRUE`,
      withCheck: sql`TRUE`,
    }),
    // Check constraints
    contentLengthCheck: check(
      'content_length_check',
      sql`LENGTH(${table.content}) >= 1 AND LENGTH(${table.content}) <= 2000`,
    ),
    likesCountCheck: check(
      'likes_count_check',
      sql`${table.likes_count} >= 0`,
    ),
    repliesCountCheck: check(
      'replies_count_check',
      sql`${table.replies_count} >= 0`,
    ),
  }),
).enableRLS()

export const comment_likes = pgTable(
  'comment_likes',
  {
    comment_id: char('comment_id', { length: 26 })
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    user_id: char('user_id', { length: 26 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  },
  table => ({
    // Primary key
    pk: primaryKey({ columns: [table.comment_id, table.user_id] }),
    // Performance-critical indexes
    commentIdIdx: index('idx_comment_likes_comment_id').on(table.comment_id),
    userIdIdx: index('idx_comment_likes_user_id').on(table.user_id),
    // RLS Policy
    serviceRolePolicy: pgPolicy('service_role_all_comment_likes', {
      as: 'permissive',
      to: 'service_role',
      for: 'all',
      using: sql`TRUE`,
      withCheck: sql`TRUE`,
    }),
  }),
).enableRLS()

export const comment_reports = pgTable(
  'comment_reports',
  {
    id: char('id', { length: 26 })
      .primaryKey()
      .default(sql`generate_ulid()`),
    comment_id: char('comment_id', { length: 26 })
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    reporter_user_id: char('reporter_user_id', { length: 26 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    reason: varchar('reason', { length: 50 })
      .notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 })
      .default('pending'),
    reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => ({
    // Performance-critical indexes
    commentIdIdx: index('idx_comment_reports_comment_id').on(table.comment_id),
    reporterUserIdIdx: index('idx_comment_reports_reporter_user_id').on(table.reporter_user_id),
    statusIdx: index('idx_comment_reports_status').on(table.status),
    createdAtIdx: index('idx_comment_reports_created_at').on(table.created_at),
    // Composite indexes for common queries
    statusCreatedIdx: index('idx_comment_reports_status_created').on(table.status, table.created_at),
    // RLS Policy
    serviceRolePolicy: pgPolicy('service_role_all_comment_reports', {
      as: 'permissive',
      to: 'service_role',
      for: 'all',
      using: sql`TRUE`,
      withCheck: sql`TRUE`,
    }),
    // Check constraints
    reasonCheck: check(
      'reason_check',
      sql`${table.reason} IN ('spam', 'abuse', 'inappropriate', 'other')`,
    ),
    statusCheck: check(
      'status_check',
      sql`${table.status} IN ('pending', 'reviewed', 'resolved', 'dismissed')`,
    ),
  }),
).enableRLS()

export const v_comments_with_user = pgView('v_comments_with_user', {
  id: char('id', { length: 26 }),
  event_id: char('event_id', { length: 26 }),
  user_id: char('user_id', { length: 26 }),
  parent_comment_id: char('parent_comment_id', { length: 26 }),
  content: text('content'),
  is_deleted: boolean('is_deleted'),
  likes_count: integer('likes_count'),
  replies_count: integer('replies_count'),
  created_at: timestamp('created_at', { withTimezone: true }),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  username: text('username'),
  user_avatar: text('user_avatar'),
  user_address: varchar('user_address', { length: 42 }),
  recent_replies: jsonb('recent_replies'),
}).as(sql`
  SELECT
    c.id,
    c.event_id,
    c.user_id,
    c.parent_comment_id,
    c.content,
    c.is_deleted,
    c.likes_count,
    COALESCE(
      (SELECT COUNT(*)::int
       FROM ${comments} r
       WHERE r.parent_comment_id = c.id
         AND r.is_deleted = FALSE),
      0
    ) AS replies_count,
    c.created_at,
    c.updated_at,
    u.username,
    u.image AS user_avatar,
    u.address AS user_address,
    CASE
      WHEN c.parent_comment_id IS NULL THEN (
        SELECT JSON_AGG(
                 JSON_BUILD_OBJECT(
                   'id', r.id,
                   'content', r.content,
                   'user_id', r.user_id,
                   'username', r.username,
                   'user_avatar', r.user_avatar,
                   'user_address', r.user_address,
                   'likes_count', r.likes_count,
                   'created_at', r.created_at
                 )
                 ORDER BY r.created_at
               )
        FROM (
          SELECT
            r.id,
            r.content,
            r.user_id,
            ru.username,
            ru.image AS user_avatar,
            ru.address AS user_address,
            r.likes_count,
            r.created_at
          FROM ${comments} r
          JOIN ${users} ru ON r.user_id = ru.id
          WHERE r.parent_comment_id = c.id
            AND r.is_deleted = FALSE
          ORDER BY r.created_at
          LIMIT 3
        ) r
      )
    END AS recent_replies
  FROM ${comments} c
  JOIN ${users} u ON c.user_id = u.id
  WHERE c.is_deleted = FALSE
`)
