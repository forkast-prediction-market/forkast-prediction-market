import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  address: text('address').notNull(),
  email: text('email').notNull().unique(),
  email_verified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  two_factor_enabled: boolean('two_factor_enabled').default(false),
  username: text('username').unique(),
  settings: jsonb('settings'),
  affiliate_code: text('affiliate_code'),
  referred_by_user_id: text('referred_by_user_id'),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expires_at: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  account_id: text('account_id').notNull(),
  provider_id: text('provider_id').notNull(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  access_token: text('access_token'),
  refresh_token: text('refresh_token'),
  idToken: text('id_token'),
  access_token_expires_at: timestamp('access_token_expires_at'),
  refresh_token_expires_at: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const wallets = pgTable('wallets', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  address: text('address').notNull(),
  chain_id: integer('chain_id').notNull(),
  is_primary: boolean('is_primary').default(false),
  created_at: timestamp('created_at').notNull(),
})

export const two_factors = pgTable('two_factors', {
  id: text('id').primaryKey(),
  secret: text('secret').notNull(),
  backup_codes: text('backup_codes').notNull(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
})
