import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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
  referred_by_user_id: text('referred_by_user_id').references((): any => users.id, { onDelete: 'set null' }),
}, table => ({
  // Indexes from migration
  idxUsersEmail: uniqueIndex('idx_users_email').on(sql`LOWER(${table.email})`),
  idxUsersUsername: uniqueIndex('idx_users_username').on(sql`LOWER(${table.username})`),
  idxUsersAffiliateCode: uniqueIndex('idx_users_affiliate_code').on(sql`LOWER(${table.affiliate_code})`),
  // RLS policy
  serviceRoleAllUsers: pgPolicy('service_role_all_users', {
    as: 'permissive',
    to: 'service_role',
    for: 'all',
    using: sql`TRUE`,
    withCheck: sql`TRUE`,
  }),
  // Check constraints for email validation and business rules
  emailCheck: check('email_check', sql`${table.email} ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'`),
  addressCheck: check('address_check', sql`LENGTH(${table.address}) > 0`),
  usernameCheck: check('username_check', sql`${table.username} IS NULL OR LENGTH(${table.username}) >= 3`),
  affiliateCodeCheck: check('affiliate_code_check', sql`${table.affiliate_code} IS NULL OR LENGTH(${table.affiliate_code}) >= 6`),
})).enableRLS()

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
}, table => ({
  // Indexes from migration
  idxSessionsUserId: index('idx_sessions_user_id').on(table.user_id),
  // RLS policy
  serviceRoleAllSessions: pgPolicy('service_role_all_sessions', {
    as: 'permissive',
    to: 'service_role',
    for: 'all',
    using: sql`TRUE`,
    withCheck: sql`TRUE`,
  }),
  // Check constraints for business rules
  tokenCheck: check('token_check', sql`LENGTH(${table.token}) > 0`),
  expiresAtCheck: check('expires_at_check', sql`${table.expires_at} > ${table.created_at}`),
})).enableRLS()

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
}, table => ({
  // Indexes from migration
  idxAccountsUserId: index('idx_accounts_user_id').on(table.user_id),
  // RLS policy
  serviceRoleAllAccounts: pgPolicy('service_role_all_accounts', {
    as: 'permissive',
    to: 'service_role',
    for: 'all',
    using: sql`TRUE`,
    withCheck: sql`TRUE`,
  }),
  // Check constraints for business rules
  accountIdCheck: check('account_id_check', sql`LENGTH(${table.account_id}) > 0`),
  providerIdCheck: check('provider_id_check', sql`LENGTH(${table.provider_id}) > 0`),
})).enableRLS()

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
}, table => ({
  // Indexes from migration
  idxVerificationsIdentifier: index('idx_verifications_identifier').on(table.identifier),
  // RLS policy
  serviceRoleAllVerifications: pgPolicy('service_role_all_verifications', {
    as: 'permissive',
    to: 'service_role',
    for: 'all',
    using: sql`TRUE`,
    withCheck: sql`TRUE`,
  }),
  // Check constraints for business rules
  identifierCheck: check('identifier_check', sql`LENGTH(${table.identifier}) > 0`),
  valueCheck: check('value_check', sql`LENGTH(${table.value}) > 0`),
  expiresAtCheck: check('expires_at_check', sql`${table.expires_at} > ${table.created_at}`),
})).enableRLS()

export const wallets = pgTable('wallets', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  address: text('address').notNull(),
  chain_id: integer('chain_id').notNull(),
  is_primary: boolean('is_primary').default(false),
  created_at: timestamp('created_at').notNull(),
}, table => ({
  // Indexes from migration
  idxWalletsUserId: index('idx_wallets_user_id').on(table.user_id),
  // RLS policy
  serviceRoleAllWallets: pgPolicy('service_role_all_wallets', {
    as: 'permissive',
    to: 'service_role',
    for: 'all',
    using: sql`TRUE`,
    withCheck: sql`TRUE`,
  }),
  // Check constraints for business rules
  addressCheck: check('address_check', sql`LENGTH(${table.address}) > 0`),
  chainIdCheck: check('chain_id_check', sql`${table.chain_id} > 0`),
})).enableRLS()

export const two_factors = pgTable('two_factors', {
  id: text('id').primaryKey(),
  secret: text('secret').notNull(),
  backup_codes: text('backup_codes').notNull(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
}, table => ({
  // Indexes from migration
  idxTwoFactorsUserId: index('idx_two_factors_user_id').on(table.user_id),
  // RLS policy
  serviceRoleAllTwoFactors: pgPolicy('service_role_all_two_factors', {
    as: 'permissive',
    to: 'service_role',
    for: 'all',
    using: sql`TRUE`,
    withCheck: sql`TRUE`,
  }),
  // Check constraints for business rules
  secretCheck: check('secret_check', sql`LENGTH(${table.secret}) > 0`),
  backupCodesCheck: check('backup_codes_check', sql`LENGTH(${table.backup_codes}) > 0`),
})).enableRLS()
