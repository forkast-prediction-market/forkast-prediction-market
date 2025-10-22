import { pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core'

export const settings = pgTable('settings', {
  id: smallint('id').primaryKey().generatedAlwaysAsIdentity(),
  group: text('group').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
})
