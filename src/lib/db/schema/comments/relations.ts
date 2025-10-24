import { relations } from 'drizzle-orm'
import { users } from '@/lib/db/schema/auth/tables'
import { events } from '@/lib/db/schema/events/tables'
import { comment_likes, comment_reports, comments } from './tables'

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
