'use server'

import { eq } from 'drizzle-orm'
import { users } from '@/lib/db/schema/auth/tables'
import { db } from '@/lib/drizzle'
import { decryptSecret, encryptSecret } from '@/lib/encryption'
import { getBetterAuthSecretHash } from '@/lib/trading-auth/secret-hash'

interface TradingAuthSecretEntry {
  key: string
  secret: string
  passphrase: string
  updatedAt: string
}

interface TradingAuthSecretSettings {
  encryptionSecretHash?: string
  relayer?: TradingAuthSecretEntry
  clob?: TradingAuthSecretEntry
  approvals?: {
    completed?: boolean
    updatedAt?: string
  }
}

interface TradingAuthStorePayload {
  relayer?: {
    key: string
    secret: string
    passphrase: string
  }
  clob?: {
    key: string
    secret: string
    passphrase: string
  }
}

export interface TradingAuthSecrets {
  relayer?: {
    key: string
    secret: string
    passphrase: string
  }
  clob?: {
    key: string
    secret: string
    passphrase: string
  }
}

function hasStoredTradingCredentials(tradingAuth: TradingAuthSecretSettings) {
  return Boolean(tradingAuth.relayer?.key || tradingAuth.clob?.key)
}

async function invalidateTradingAuthCredentials(userId: string, settings: Record<string, any>) {
  const tradingAuth = settings.tradingAuth as TradingAuthSecretSettings | undefined
  if (!tradingAuth) {
    return { invalidated: false, settings }
  }

  if (!hasStoredTradingCredentials(tradingAuth)) {
    return { invalidated: false, settings }
  }

  const currentHash = getBetterAuthSecretHash()
  const storedHash = tradingAuth.encryptionSecretHash

  const hasMismatch = !storedHash || storedHash !== currentHash
  if (!hasMismatch) {
    return { invalidated: false, settings }
  }

  const nextTradingAuth: TradingAuthSecretSettings = {
    ...tradingAuth,
    encryptionSecretHash: currentHash,
  }

  delete nextTradingAuth.relayer
  delete nextTradingAuth.clob

  const nextSettings = {
    ...settings,
    tradingAuth: nextTradingAuth,
  }

  await db
    .update(users)
    .set({ settings: nextSettings })
    .where(eq(users.id, userId))

  return { invalidated: true, settings: nextSettings }
}

export async function ensureUserTradingAuthSecretFingerprint(userId: string, rawSettings: Record<string, any> | null | undefined) {
  const settings = (rawSettings ?? {}) as Record<string, any>
  const result = await invalidateTradingAuthCredentials(userId, settings)
  return result.settings
}

export async function getUserTradingAuthSecrets(userId: string): Promise<TradingAuthSecrets | null> {
  const [row] = await db
    .select({ settings: users.settings })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const settings = (row?.settings ?? {}) as Record<string, any>
  const invalidation = await invalidateTradingAuthCredentials(userId, settings)
  if (invalidation.invalidated) {
    return null
  }

  const tradingAuth = (settings as any)?.tradingAuth as TradingAuthSecretSettings | undefined
  if (!tradingAuth) {
    return null
  }

  function decodeEntry(entry?: TradingAuthSecretEntry | null) {
    if (!entry) {
      return undefined
    }
    return {
      key: decryptSecret(entry.key),
      secret: decryptSecret(entry.secret),
      passphrase: decryptSecret(entry.passphrase),
    }
  }

  return {
    relayer: decodeEntry(tradingAuth.relayer),
    clob: decodeEntry(tradingAuth.clob),
  }
}

export async function saveUserTradingAuthCredentials(userId: string, payload: TradingAuthStorePayload) {
  if (!payload.relayer && !payload.clob) {
    return
  }

  const encryptionSecretHash = getBetterAuthSecretHash()

  const [row] = await db
    .select({ settings: users.settings })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const settings = (row?.settings ?? {}) as Record<string, any>
  const tradingAuth = (settings.tradingAuth ?? {}) as Record<string, any>
  const updatedAt = new Date().toISOString()
  tradingAuth.encryptionSecretHash = encryptionSecretHash

  if (payload.relayer) {
    tradingAuth.relayer = {
      key: encryptSecret(payload.relayer.key),
      secret: encryptSecret(payload.relayer.secret),
      passphrase: encryptSecret(payload.relayer.passphrase),
      updatedAt,
    }
  }

  if (payload.clob) {
    tradingAuth.clob = {
      key: encryptSecret(payload.clob.key),
      secret: encryptSecret(payload.clob.secret),
      passphrase: encryptSecret(payload.clob.passphrase),
      updatedAt,
    }
  }

  settings.tradingAuth = tradingAuth

  await db
    .update(users)
    .set({ settings })
    .where(eq(users.id, userId))
}

export async function markTokenApprovalsCompleted(userId: string) {
  const [row] = await db
    .select({ settings: users.settings })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const settings = (row?.settings ?? {}) as Record<string, any>
  const tradingAuth = (settings.tradingAuth ?? {}) as Record<string, any>
  const updatedAt = new Date().toISOString()

  tradingAuth.approvals = {
    completed: true,
    updatedAt,
  }

  settings.tradingAuth = tradingAuth

  await db
    .update(users)
    .set({ settings })
    .where(eq(users.id, userId))

  return {
    enabled: true,
    updatedAt,
  }
}
