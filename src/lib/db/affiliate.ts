import { randomBytes } from 'node:crypto'
import { and, desc, eq, ilike, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/drizzle'
import { affiliate_referrals, users } from './schema'

const AFFILIATE_CODE_BYTES = 4

interface QueryResult<T> {
  data: T | null
  error: string | null
}

interface AffiliateUser {
  id: string
  affiliate_code: string | null
  username: string | null
  address: string
  image: string | null
}

interface ReferralData {
  user_id: string
  affiliate_user_id: string
  created_at: Date
  affiliate_user: {
    address: string
  }
}

interface ReferralArgs {
  user_id: string
  affiliate_user_id: string
}

interface ReferralRecord {
  user_id: string
  affiliate_user_id: string
  created_at: Date
}

interface AffiliateStats {
  total_referrals: number
  active_referrals: number
  total_volume: number
  total_affiliate_fees: number
  total_fork_fees: number
}

interface AffiliateOverview {
  affiliate_user_id: string
  total_referrals: number
  total_volume: number
  total_affiliate_fees: number
}

interface AffiliateProfile {
  id: string
  username: string | null
  address: string
  image: string | null
  affiliate_code: string | null
}

interface ReferralList {
  user_id: string
  created_at: Date
  users: {
    username: string | null
    address: string
    image: string | null
  }
}

async function executeQuery<T>(
  queryFn: () => Promise<T>,
): Promise<QueryResult<T>> {
  try {
    const data = await queryFn()
    return { data, error: null }
  }
  catch (error) {
    console.error('Drizzle database query error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}

function convertToNumber(value: any): number {
  if (value === null || value === undefined) {
    return 0
  }
  const num = Number(value)
  return Number.isNaN(num) ? 0 : num
}

function convertAffiliateStats(rawData: any): AffiliateStats {
  return {
    total_referrals: convertToNumber(rawData.total_referrals),
    active_referrals: convertToNumber(rawData.active_referrals),
    total_volume: convertToNumber(rawData.total_volume),
    total_affiliate_fees: convertToNumber(rawData.total_affiliate_fees),
    total_fork_fees: convertToNumber(rawData.total_fork_fees),
  }
}

function convertAffiliateOverview(rawData: any[]): AffiliateOverview[] {
  return rawData.map(item => ({
    affiliate_user_id: item.affiliate_user_id,
    total_referrals: convertToNumber(item.total_referrals),
    total_volume: convertToNumber(item.total_volume),
    total_affiliate_fees: convertToNumber(item.total_affiliate_fees),
  }))
}

function generateAffiliateCode(): string {
  return randomBytes(AFFILIATE_CODE_BYTES).toString('hex')
}

async function generateUniqueAffiliateCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = generateAffiliateCode()

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.affiliate_code, candidate))
      .limit(1)

    if (existing.length === 0) {
      return candidate
    }
  }

  throw new Error('Failed to generate unique affiliate code')
}

export const AffiliateRepository = {
  async ensureUserAffiliateCode(userId: string): Promise<QueryResult<string>> {
    return executeQuery(async () => {
      const existingUser = await db
        .select({ affiliate_code: users.affiliate_code })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (existingUser.length === 0) {
        throw new Error('User not found')
      }

      const user = existingUser[0]

      if (user.affiliate_code) {
        return user.affiliate_code
      }

      const code = await generateUniqueAffiliateCode()

      const updatedUser = await db
        .update(users)
        .set({ affiliate_code: code })
        .where(eq(users.id, userId))
        .returning({ affiliate_code: users.affiliate_code })

      if (updatedUser.length === 0) {
        throw new Error('Failed to update user with affiliate code')
      }

      return updatedUser[0].affiliate_code!
    })
  },

  async getAffiliateByCode(code: string): Promise<QueryResult<AffiliateUser | null>> {
    'use cache'

    return executeQuery(async () => {
      const result = await db
        .select({
          id: users.id,
          affiliate_code: users.affiliate_code,
          username: users.username,
          address: users.address,
          image: users.image,
        })
        .from(users)
        .where(ilike(users.affiliate_code, code))
        .limit(1)

      return result.length > 0 ? result[0] : null
    })
  },

  async getReferral(userId: string): Promise<QueryResult<ReferralData | null>> {
    'use cache'

    return executeQuery(async () => {
      const result = await db
        .select({
          user_id: affiliate_referrals.user_id,
          affiliate_user_id: affiliate_referrals.affiliate_user_id,
          created_at: affiliate_referrals.created_at,
          affiliate_user_address: users.address,
        })
        .from(affiliate_referrals)
        .innerJoin(users, eq(affiliate_referrals.affiliate_user_id, users.id))
        .where(eq(affiliate_referrals.user_id, userId))
        .limit(1)

      if (result.length === 0) {
        return null
      }

      const row = result[0]
      return {
        user_id: row.user_id,
        affiliate_user_id: row.affiliate_user_id,
        created_at: row.created_at,
        affiliate_user: {
          address: row.affiliate_user_address,
        },
      }
    })
  },

  async recordReferral(args: ReferralArgs): Promise<QueryResult<ReferralRecord>> {
    return executeQuery(async () => {
      if (args.user_id === args.affiliate_user_id) {
        throw new Error('Self referrals are not allowed.')
      }

      const existingReferral = await db
        .select({
          affiliate_user_id: affiliate_referrals.affiliate_user_id,
          user_id: affiliate_referrals.user_id,
          created_at: affiliate_referrals.created_at,
        })
        .from(affiliate_referrals)
        .where(eq(affiliate_referrals.user_id, args.user_id))
        .limit(1)

      if (existingReferral.length > 0 && existingReferral[0].affiliate_user_id === args.affiliate_user_id) {
        return {
          user_id: existingReferral[0].user_id,
          affiliate_user_id: existingReferral[0].affiliate_user_id,
          created_at: existingReferral[0].created_at,
        }
      }

      const upsertResult = await db
        .insert(affiliate_referrals)
        .values({
          user_id: args.user_id,
          affiliate_user_id: args.affiliate_user_id,
        })
        .onConflictDoUpdate({
          target: affiliate_referrals.user_id,
          set: {
            affiliate_user_id: args.affiliate_user_id,
          },
        })
        .returning({
          user_id: affiliate_referrals.user_id,
          affiliate_user_id: affiliate_referrals.affiliate_user_id,
          created_at: affiliate_referrals.created_at,
        })

      if (upsertResult.length === 0) {
        throw new Error('Failed to create or update referral record')
      }

      const referralRecord = upsertResult[0]

      await db
        .update(users)
        .set({ referred_by_user_id: args.affiliate_user_id })
        .where(
          and(
            eq(users.id, args.user_id),
            isNull(users.referred_by_user_id),
          ),
        )

      return referralRecord
    })
  },

  async getUserAffiliateStats(userId: string): Promise<QueryResult<AffiliateStats>> {
    'use cache'

    return executeQuery(async () => {
      const result = await db.execute(
        sql`SELECT * FROM get_affiliate_stats(${userId})`,
      )

      if (!result || result.length === 0) {
        return {
          total_referrals: 0,
          active_referrals: 0,
          total_volume: 0,
          total_affiliate_fees: 0,
          total_fork_fees: 0,
        }
      }

      const rawData = result[0]
      return convertAffiliateStats(rawData)
    })
  },

  async listAffiliateOverview(): Promise<QueryResult<AffiliateOverview[]>> {
    'use cache'

    return executeQuery(async () => {
      const result = await db.execute(
        sql`SELECT * FROM get_affiliate_overview()`,
      )

      if (!result || result.length === 0) {
        return []
      }

      return convertAffiliateOverview(result)
    })
  },

  async getAffiliateProfiles(userIds: string[]): Promise<QueryResult<AffiliateProfile[]>> {
    'use cache'

    return executeQuery(async () => {
      if (!userIds.length) {
        return []
      }

      const result = await db
        .select({
          id: users.id,
          username: users.username,
          address: users.address,
          image: users.image,
          affiliate_code: users.affiliate_code,
        })
        .from(users)
        .where(inArray(users.id, userIds))

      return result.map(user => ({
        id: user.id,
        username: user.username,
        address: user.address,
        image: user.image,
        affiliate_code: user.affiliate_code,
      }))
    })
  },

  async listReferralsByAffiliate(affiliateUserId: string, limit = 20): Promise<QueryResult<ReferralList[]>> {
    'use cache'

    return executeQuery(async () => {
      const result = await db
        .select({
          user_id: affiliate_referrals.user_id,
          created_at: affiliate_referrals.created_at,
          username: users.username,
          address: users.address,
          image: users.image,
        })
        .from(affiliate_referrals)
        .innerJoin(users, eq(affiliate_referrals.user_id, users.id))
        .where(eq(affiliate_referrals.affiliate_user_id, affiliateUserId))
        .orderBy(desc(affiliate_referrals.created_at)) // Apply descending order by created_at using Drizzle orderBy
        .limit(limit) // Implement pagination with configurable limit using Drizzle limit

      return result.map(row => ({
        user_id: row.user_id,
        created_at: row.created_at,
        users: {
          username: row.username,
          address: row.address,
          image: row.image,
        },
      }))
    })
  },
}
