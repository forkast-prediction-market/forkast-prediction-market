import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  char,
  check,
  integer,
  pgTable,
  pgView,
  primaryKey,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from './auth'
import { events } from './events'

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
)

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
    pk: primaryKey({ columns: [table.comment_id, table.user_id] }),
  }),
)

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
    reasonCheck: check(
      'reason_check',
      sql`${table.reason} IN ('spam', 'abuse', 'inappropriate', 'other')`,
    ),
    statusCheck: check(
      'status_check',
      sql`${table.status} IN ('pending', 'reviewed', 'resolved', 'dismissed')`,
    ),
  }),
)

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

  recent_replies: text('recent_replies'), // JSON field
}).existing()

export const commentsRelations = relations(comments, ({ one, many }) => ({
  event: one(events, {
    fields: [comments.event_id],
    references: [events.id],
  }),
  user: one(users, {
    fields: [comments.user_id],
    references: [users.id],
  }),
  parentComment: one(comments, {
    fields: [comments.parent_comment_id],
    references: [comments.id],
    relationName: 'comment_replies',
  }),
  replies: many(comments, {
    relationName: 'comment_replies',
  }),
  likes: many(comment_likes),
  reports: many(comment_reports),
}))

export const commentLikesRelations = relations(comment_likes, ({ one }) => ({
  comment: one(comments, {
    fields: [comment_likes.comment_id],
    references: [comments.id],
  }),
  user: one(users, {
    fields: [comment_likes.user_id],
    references: [users.id],
  }),
}))

export const commentReportsRelations = relations(comment_reports, ({ one }) => ({
  comment: one(comments, {
    fields: [comment_reports.comment_id],
    references: [comments.id],
  }),
  reporter: one(users, {
    fields: [comment_reports.reporter_user_id],
    references: [users.id],
  }),
}))
