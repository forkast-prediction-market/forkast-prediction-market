import { pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core'

export const settings = pgTable(
  'settings',
  {
    id: smallint().primaryKey().generatedAlwaysAsIdentity(),
    group: text().notNull(),
    key: text().notNull(),
    value: text().notNull(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow().notNull(),
  },
)
