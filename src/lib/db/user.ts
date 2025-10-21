import type { ActivityOrder, QueryResult } from '@/types'
import { asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import { cookies, headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AffiliateRepository } from '@/lib/db/affiliate'
import { conditions, events, markets, orders, outcomes, users } from '@/lib/db/schema'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'
import { getSupabaseImageUrl } from '@/lib/supabase'

export const UserRepository = {
  async getProfileByUsername(username: string) {
    'use cache'

    return await runQuery(async () => {
      const result = await db
        .select({
          id: users.id,
          address: users.address,
          username: users.username,
          image: users.image,
          created_at: users.created_at,
        })
        .from(users)
        .where(or(
          eq(users.username, username),
          eq(users.address, username),
        ))
        .limit(1)

      const rawData = result[0] || null

      if (!rawData) {
        return { data: null, error: null }
      }

      // Transform the data to match expected types
      const data = {
        id: rawData.id,
        address: rawData.address,
        username: rawData.username || undefined, // Convert null to undefined
        image: rawData.image ? getSupabaseImageUrl(rawData.image) : `https://avatar.vercel.sh/${rawData.address}.png`,
        created_at: rawData.created_at,
      }

      return { data, error: null }
    })
  },

  async updateUserProfileById(userId: string, input: any) {
    try {
      const result = await db
        .update(users)
        .set(input)
        .where(eq(users.id, userId))
        .returning({ id: users.id })

      const data = result[0] || null

      return { data, error: null }
    }
    catch (error: any) {
      if (error.code === '23505') {
        if (error.detail?.includes('email') || error.constraint?.includes('email')) {
          return { data: null, error: { email: 'Email is already taken.' } }
        }
        if (error.detail?.includes('username') || error.constraint?.includes('username')) {
          return { data: null, error: { username: 'Username is already taken.' } }
        }
      }
      return { data: null, error: 'Failed to update user.' }
    }
  },

  async updateUserNotificationPreferencesById(userId: string, preferences: any) {
    return await runQuery(async () => {
      // Fetch current settings using Drizzle select with eq() condition and limit(1)
      const currentUserResult = await db
        .select({ settings: users.settings })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      const currentUser = currentUserResult[0]
      let settingsPayload: any = currentUser?.settings ?? {}

      // Implement JSON parsing logic with try-catch for malformed settings
      if (typeof settingsPayload === 'string') {
        try {
          settingsPayload = JSON.parse(settingsPayload)
        }
        catch {
          settingsPayload = {}
        }
      }

      // Create settings merging logic to combine existing settings with new notifications
      const mergedSettings = {
        ...settingsPayload,
        notifications: preferences,
      }

      // Update users table with merged settings object using Drizzle update
      const result = await db
        .update(users)
        .set({ settings: mergedSettings })
        .where(eq(users.id, userId))
        .returning({ id: users.id })

      const data = result[0] || null

      if (!data) {
        return { data: null, error: 'Failed to update notification preferences.' }
      }

      return { data, error: null }
    })
  },

  async getCurrentUser({ disableCookieCache = false }: { disableCookieCache?: boolean } = {}) {
    const session = await auth.api.getSession({
      query: {
        disableCookieCache,
      },
      headers: await headers(),
    })

    if (!session?.user) {
      return null
    }

    const user: any = session.user
    if (user.email.includes(process.env.VERCEL_PROJECT_PRODUCTION_URL!) || user.email.includes('vercel.app')) {
      user.email = ''
    }

    if (!user.settings) {
      user.settings = {}
    }
    else if (typeof user.settings === 'string') {
      try {
        user.settings = JSON.parse(user.settings)
      }
      catch {
        user.settings = {}
      }
    }

    if (!user.affiliate_code) {
      try {
        const { data: code } = await AffiliateRepository.ensureUserAffiliateCode(user.id)
        if (code) {
          user.affiliate_code = code
        }
      }
      catch (error) {
        console.error('Failed to ensure affiliate code', error)
      }
    }

    if (!user.referred_by_user_id) {
      try {
        const cookieStore = await cookies()
        const referralCookie = cookieStore.get('platform_affiliate')

        if (referralCookie?.value) {
          const parsed = JSON.parse(referralCookie.value) as {
            affiliateUserId?: string
            timestamp?: number
          }

          if (parsed?.affiliateUserId) {
            await AffiliateRepository.recordReferral({
              user_id: user.id,
              affiliate_user_id: parsed.affiliateUserId,
            })
          }
        }
      }
      catch (error) {
        console.error('Failed to record affiliate referral', error)
      }
    }

    return user
  },

  async listUsers(params: {
    limit?: number
    offset?: number
    search?: string
    sortBy?: 'username' | 'email' | 'address' | 'created_at'
    sortOrder?: 'asc' | 'desc'
  } = {}) {
    'use cache'

    try {
      const {
        limit: rawLimit = 100,
        offset = 0,
        search,
        sortBy = 'created_at',
        sortOrder = 'desc',
      } = params

      // Validate limit parameter with default 100 and range validation
      const limit = Math.min(Math.max(rawLimit, 1), 1000)

      // Prepare search condition
      let whereCondition
      if (search && search.trim()) {
        const searchTerm = search.trim()
        const sanitizedSearchTerm = searchTerm
          .replace(/[,()]/g, ' ')
          .replace(/['"]/g, '')
          .replace(/\s+/g, ' ')
          .trim()

        if (sanitizedSearchTerm) {
          whereCondition = or(
            ilike(users.username, `%${sanitizedSearchTerm}%`),
            ilike(users.email, `%${sanitizedSearchTerm}%`),
            ilike(users.address, `%${sanitizedSearchTerm}%`),
          )
        }
      }

      // Prepare sort columns
      let orderByClause
      if (sortBy === 'username') {
        const sortDirection = sortOrder === 'asc' ? asc : desc
        orderByClause = [sortDirection(users.username), sortDirection(users.address)]
      }
      else {
        let sortColumn
        switch (sortBy) {
          case 'email':
            sortColumn = users.email
            break
          case 'address':
            sortColumn = users.address
            break
          case 'created_at':
            sortColumn = users.created_at
            break
          default:
            sortColumn = users.created_at
        }
        const sortDirection = sortOrder === 'asc' ? asc : desc
        orderByClause = [sortDirection(sortColumn)]
      }

      // Build and execute main query
      const queryBuilder = db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          address: users.address,
          created_at: users.created_at,
          image: users.image,
          affiliate_code: users.affiliate_code,
          referred_by_user_id: users.referred_by_user_id,
        })
        .from(users)

      const data = await (whereCondition
        ? queryBuilder.where(whereCondition).orderBy(...orderByClause).limit(limit).offset(offset)
        : queryBuilder.orderBy(...orderByClause).limit(limit).offset(offset))

      // Build and execute count query
      const countQueryBuilder = db
        .select({ count: count() })
        .from(users)

      const countResult = await (whereCondition
        ? countQueryBuilder.where(whereCondition)
        : countQueryBuilder)
      const totalCount = countResult[0]?.count || 0

      return { data, error: null, count: totalCount }
    }
    catch (error) {
      console.error('Error in listUsers:', error)
      return { data: null, error: 'Failed to fetch users', count: 0 }
    }
  },

  async getUsersByIds(ids: string[]) {
    // Add empty array check to return early for empty ids input
    if (!ids.length) {
      return { data: [], error: null }
    }

    return await runQuery(async () => {
      // Replace supabaseAdmin query with Drizzle select using inArray() condition
      const result = await db
        .select({
          id: users.id,
          username: users.username,
          address: users.address,
          image: users.image,
        })
        .from(users)
        .where(inArray(users.id, ids))

      return { data: result, error: null }
    })
  },

  async getUserActivity(args: {
    address: string
    limit: number
    offset: number
    minAmount?: number
  }): Promise<QueryResult<ActivityOrder[]>> {
    // Preserve user validation using existing getProfileByUsername method call
    const { data: userData, error: userError } = await this.getProfileByUsername(args.address)

    if (userError || !userData) {
      return { data: null, error: 'User not found' }
    }

    return await runQuery(async () => {
      // Handle optional minAmount by adjusting limit for filtering after processing
      const queryLimit = args.minAmount && args.minAmount > 0 ? args.limit * 2 : args.limit

      // Create complex join query using innerJoin() for orders, users, outcomes, conditions, markets, events
      const result = await db
        .select({
          // Order fields
          id: orders.id,
          side: orders.side,
          amount: orders.amount,
          price: orders.price,
          created_at: orders.created_at,
          status: orders.status,
          // User fields
          user_id: users.id,
          user_username: users.username,
          user_address: users.address,
          user_image: users.image,
          // Outcome fields
          outcome_text: outcomes.outcome_text,
          outcome_index: outcomes.outcome_index,
          // Market fields
          market_title: markets.title,
          market_slug: markets.slug,
          market_icon_url: markets.icon_url,
          // Event fields
          event_slug: events.slug,
          event_show_market_icons: events.show_market_icons,
        })
        .from(orders)
        .innerJoin(users, eq(orders.user_id, users.id))
        .innerJoin(outcomes, eq(orders.token_id, outcomes.token_id))
        .innerJoin(conditions, eq(orders.condition_id, conditions.id))
        .innerJoin(markets, eq(conditions.id, markets.condition_id))
        .innerJoin(events, eq(markets.event_id, events.id))
        // Apply user_id filtering using eq() condition and descending id ordering using desc()
        .where(eq(orders.user_id, userData.id))
        .orderBy(desc(orders.id))
        // Implement limit and offset for pagination
        .limit(queryLimit)
        .offset(args.offset)

      // Transform joined query results into ActivityOrder format
      const activities: ActivityOrder[] = result
        .map((row) => {
          try {
            // Ensure proper error handling and null checks for missing related data
            if (!row.id || !row.user_id || !row.outcome_text || !row.market_title) {
              return null
            }

            // Calculate total_value from amount and price fields
            const amount = typeof row.amount === 'string' ? Number.parseFloat(row.amount) : (row.amount || 0)
            const price = typeof row.price === 'string' ? Number.parseFloat(row.price) : (row.price || 0)
            const totalValue = amount * price

            // Implement image URL processing for both user and market images
            const userImage = row.user_image
              ? getSupabaseImageUrl(row.user_image)
              : `https://avatar.vercel.sh/${row.user_address}.png`

            const marketIconUrl = row.market_icon_url
              ? getSupabaseImageUrl(row.market_icon_url)
              : ''

            const activity: ActivityOrder = {
              id: row.id,
              user: {
                id: row.user_id,
                username: row.user_username,
                address: row.user_address,
                image: userImage,
              },
              side: row.side as 'buy' | 'sell',
              amount,
              price,
              outcome: {
                index: row.outcome_index || 0,
                text: row.outcome_text || '',
              },
              market: {
                title: row.market_title || '',
                slug: row.market_slug || '',
                icon_url: marketIconUrl,
                event: {
                  slug: row.event_slug || '',
                  show_market_icons: row.event_show_market_icons || false,
                },
              },
              total_value: totalValue,
              created_at: row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at || ''),
              status: row.status || '',
            }

            return activity
          }
          catch (error) {
            console.error('Error transforming activity row:', error, row)
            return null
          }
        })
        .filter((activity): activity is ActivityOrder => activity !== null)

      // Apply minAmount filtering after data transformation when specified
      let filteredActivities = activities
      if (args.minAmount && args.minAmount > 0) {
        filteredActivities = activities.filter(activity => activity.total_value >= args.minAmount!)
        // Limit to requested amount after filtering
        filteredActivities = filteredActivities.slice(0, args.limit)
      }

      return { data: filteredActivities, error: null }
    })
  },
}
