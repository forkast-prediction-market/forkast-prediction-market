'use server'

import { eq } from 'drizzle-orm'
import { users } from '@/lib/db/schema/auth/tables'
import { db } from '@/lib/drizzle'
import { decryptSecret, encryptSecret } from '@/lib/encryption'

interface TradingAuthSecretEntry {
  key: string
  secret: string
  passphrase: string
  updatedAt: string
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

export async function getUserTradingAuthSecrets(userId: string): Promise<TradingAuthSecrets | null> {
  const [row] = await db
    .select({ settings: users.settings })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const tradingAuth = (row?.settings as any)?.tradingAuth as Record<string, TradingAuthSecretEntry> | undefined
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

  const [row] = await db
    .select({ settings: users.settings })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const settings = (row?.settings ?? {}) as Record<string, any>
  const tradingAuth = (settings.tradingAuth ?? {}) as Record<string, any>
  const updatedAt = new Date().toISOString()

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
