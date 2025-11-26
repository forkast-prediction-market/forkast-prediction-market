import type { ActivityOrder, MarketOrderType, PositionsQueryParams, ProxyWalletStatus, QueryResult, User, UserMarketOutcomePosition, UserPosition } from '@/types'
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { cookies, headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { getSafeProxyWalletAddress, isProxyWalletDeployed } from '@/lib/contracts/safeProxy'
import { AffiliateRepository } from '@/lib/db/queries/affiliate'
import { users } from '@/lib/db/schema/auth/tables'
import { conditions, events, markets, outcomes } from '@/lib/db/schema/events/tables'
import { orders, v_user_outcome_positions } from '@/lib/db/schema/orders/tables'
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
          proxy_wallet_address: users.proxy_wallet_address,
          username: users.username,
          image: users.image,
          created_at: users.created_at,
        })
        .from(users)
        .where(or(
          eq(users.username, username),
          eq(users.address, username),
          eq(users.proxy_wallet_address, username),
        ))
        .limit(1)

      const rawData = result[0] || null

      if (!rawData) {
        return { data: null, error: null }
      }

      const data = {
        id: rawData.id,
        address: rawData.address,
        proxy_wallet_address: rawData.proxy_wallet_address,
        username: rawData.username!,
        image: rawData.image ? getSupabaseImageUrl(rawData.image) : `https://avatar.vercel.sh/${rawData.address}.png`,
        created_at: rawData.created_at,
      }

      return { data, error: null }
    })
  },

  async updateUserProfileById(userId: string, input: any) {
    return runQuery(async () => {
      try {
        const result = await db
          .update(users)
          .set(input)
          .where(eq(users.id, userId))
          .returning()

        const data = result[0] as typeof users.$inferSelect | undefined

        if (!data) {
          return { data: null, error: 'User not found.' }
        }

        return { data: data!, error: null }
      }
      catch (error: any) {
        if (error.cause?.toString().includes('idx_users_email')) {
          return { data: null, error: 'Email is already taken.' }
        }

        if (error.cause?.toString().includes('idx_users_username')) {
          return { data: null, error: 'Username is already taken.' }
        }

        return { data: null, error: 'Failed to update user.' }
      }
    })
  },

  async updateUserNotificationSettings(currentUser: User, preferences: any) {
    return await runQuery(async () => {
      const settingsPayload: any = currentUser?.settings ?? {}

      const mergedSettings = {
        ...settingsPayload,
        notifications: preferences,
      }

      const result = await db
        .update(users)
        .set({ settings: mergedSettings })
        .where(eq(users.id, currentUser.id))
        .returning({ id: users.id })

      const data = result[0] || null

      if (!data) {
        return { data: null, error: DEFAULT_ERROR_MESSAGE }
      }

      return { data, error: null }
    })
  },

  async updateUserTradingSettings(currentUser: User, preferences: { market_order_type: MarketOrderType }) {
    return await runQuery(async () => {
      const settingsPayload: any = currentUser?.settings ?? {}

      const mergedSettings = {
        ...settingsPayload,
        trading: preferences,
      }

      const result = await db
        .update(users)
        .set({ settings: mergedSettings })
        .where(eq(users.id, currentUser.id))
        .returning({ id: users.id })

      const data = result[0] || null

      if (!data) {
        return { data: null, error: DEFAULT_ERROR_MESSAGE }
      }

      return { data, error: null }
    })
  },

  async getCurrentUser({ disableCookieCache = false }: { disableCookieCache?: boolean } = {}) {
    try {
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
      const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL
      const rawEmail = typeof user.email === 'string' ? user.email : ''
      const shouldRedactEmail = Boolean(
        rawEmail
        && (
          (productionDomain && rawEmail.includes(productionDomain))
          || rawEmail.includes('vercel.app')
        ),
      )

      user.email = shouldRedactEmail ? '' : rawEmail

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

            if (parsed?.affiliateUserId && parsed.affiliateUserId !== user.id) {
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

      const proxyAddress = await ensureUserProxyWallet(user)

      if (!user.username) {
        const addressForUsername = proxyAddress
          || (typeof user.proxy_wallet_address === 'string' ? user.proxy_wallet_address : '')
          || (typeof user.address === 'string' ? user.address : '')

        const generatedUsername = addressForUsername ? generateUsernameFromAddress(addressForUsername) : null

        if (generatedUsername) {
          try {
            const result = await db
              .update(users)
              .set({ username: generatedUsername })
              .where(eq(users.id, user.id))
              .returning({ username: users.username })

            const updatedUsername = result[0]?.username
            if (updatedUsername) {
              user.username = updatedUsername
            }
          }
          catch (error) {
            console.error('Failed to set deterministic username', error)
          }
        }
      }

      return user
    }
    catch {
      return null
    }
  },

  async listUsers(params: {
    limit?: number
    offset?: number
    search?: string
    sortBy?: 'username' | 'email' | 'address' | 'created_at'
    sortOrder?: 'asc' | 'desc'
  } = {}) {
    'use cache'

    const { data, error } = await runQuery(async () => {
      const {
        limit: rawLimit = 100,
        offset = 0,
        search,
        sortBy = 'created_at',
        sortOrder = 'desc',
      } = params

      const limit = Math.min(Math.max(rawLimit, 1), 1000)

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
            ilike(users.proxy_wallet_address, `%${sanitizedSearchTerm}%`),
          )
        }
      }

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

      const queryBuilder = db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          address: users.address,
          proxy_wallet_address: users.proxy_wallet_address,
          created_at: users.created_at,
          image: users.image,
          affiliate_code: users.affiliate_code,
          referred_by_user_id: users.referred_by_user_id,
        })
        .from(users)

      const rows = await (whereCondition
        ? queryBuilder.where(whereCondition).orderBy(...orderByClause).limit(limit).offset(offset)
        : queryBuilder.orderBy(...orderByClause).limit(limit).offset(offset))

      const countQueryBuilder = db
        .select({ count: count() })
        .from(users)

      const countResult = await (whereCondition
        ? countQueryBuilder.where(whereCondition)
        : countQueryBuilder)
      const totalCount = countResult[0]?.count || 0

      return { data: { users: rows, count: totalCount }, error: null }
    })

    if (!data || error) {
      return { data: null, error: error || DEFAULT_ERROR_MESSAGE, count: 0 }
    }

    return { data: data.users, error: null, count: data.count }
  },

  async getUsersByIds(ids: string[]) {
    if (!ids.length) {
      return { data: [], error: null }
    }

    return await runQuery(async () => {
      const result = await db
        .select({
          id: users.id,
          username: users.username,
          address: users.address,
          proxy_wallet_address: users.proxy_wallet_address,
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
    search?: string
    conditionId?: string
  }): Promise<QueryResult<ActivityOrder[]>> {
    const { data: userData, error: userError } = await this.getProfileByUsername(args.address)

    if (userError || !userData) {
      return { data: null, error: DEFAULT_ERROR_MESSAGE }
    }

    return await runQuery(async () => {
      const queryLimit = args.minAmount && args.minAmount > 0 ? args.limit * 2 : args.limit

      const filters = [eq(orders.user_id, userData.id), eq(orders.status, 'matched')]

      if (args.conditionId) {
        filters.push(eq(orders.condition_id, args.conditionId))
      }

      if (args.search && args.search.trim()) {
        filters.push(ilike(markets.title, `%${args.search.trim()}%`))
      }

      const whereCondition = filters.length > 1 ? and(...filters) : filters[0]

      const result = await db
        .select({
          id: orders.id,
          side: orders.side,
          maker_amount: orders.maker_amount,
          taker_amount: orders.taker_amount,
          price: sql<number>`CASE
            WHEN ${orders.maker_amount} + ${orders.taker_amount} > 0
            THEN ${orders.taker_amount}::numeric / (${orders.maker_amount} + ${orders.taker_amount})::numeric
            ELSE 0.5
          END`.as('price'),
          created_at: orders.created_at,
          status: orders.status,

          user_id: users.id,
          user_username: users.username,
          user_address: users.address,
          user_image: users.image,

          outcome_text: outcomes.outcome_text,
          outcome_index: outcomes.outcome_index,

          market_title: markets.title,
          market_slug: markets.slug,
          market_icon_url: markets.icon_url,

          event_slug: events.slug,
          event_show_market_icons: events.show_market_icons,
        })
        .from(orders)
        .innerJoin(users, eq(orders.user_id, users.id))
        .innerJoin(outcomes, eq(orders.token_id, outcomes.token_id))
        .innerJoin(conditions, eq(orders.condition_id, conditions.id))
        .innerJoin(markets, eq(conditions.id, markets.condition_id))
        .innerJoin(events, eq(markets.event_id, events.id))

        .where(whereCondition)
        .orderBy(desc(orders.id))

        .limit(queryLimit)
        .offset(args.offset)

      const activities: ActivityOrder[] = result
        .map((row) => {
          try {
            if (!row.id || !row.user_id || !row.outcome_text || !row.market_title) {
              return null
            }

            const makerAmount = typeof row.maker_amount === 'bigint'
              ? Number(row.maker_amount)
              : (typeof row.maker_amount === 'string'
                  ? Number.parseFloat(row.maker_amount)
                  : (row.maker_amount || 0))
            const takerAmount = typeof row.taker_amount === 'bigint'
              ? Number(row.taker_amount)
              : (typeof row.taker_amount === 'string'
                  ? Number.parseFloat(row.taker_amount)
                  : (row.taker_amount || 0))
            const price = typeof row.price === 'string' ? Number.parseFloat(row.price) : (row.price || 0)
            const side = row.side === 0 ? 'buy' : 'sell'
            const amount = side === 'buy' ? takerAmount : makerAmount
            const totalValue = amount * price

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
                username: row.user_username!,
                address: row.user_address,
                image: userImage,
              },
              side,
              amount: amount.toString(),
              price: price.toString(),
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

      let filteredActivities = activities
      if (args.minAmount && args.minAmount > 0) {
        filteredActivities = activities.filter(activity => activity.total_value >= args.minAmount!)

        filteredActivities = filteredActivities.slice(0, args.limit)
      }

      return { data: filteredActivities, error: null }
    })
  },

  async getUserPositions(params: PositionsQueryParams): Promise<QueryResult<{ data: UserPosition[], hasMore: boolean, total: number }>> {
    const { data: userData, error: userError } = await this.getProfileByUsername(params.address)

    if (userError || !userData) {
      return { data: null, error: DEFAULT_ERROR_MESSAGE }
    }

    return await runQuery(async () => {
      const whereConditions = [
        eq(orders.user_id, userData.id),
        eq(orders.status, 'matched'),
      ]

      if (params.status === 'active') {
        whereConditions.push(eq(markets.is_active, true))
        whereConditions.push(eq(markets.is_resolved, false))
      }
      else if (params.status === 'closed') {
        const closedCondition = or(
          eq(markets.is_active, false),
          eq(markets.is_resolved, true),
        )
        if (closedCondition) {
          whereConditions.push(closedCondition)
        }
      }

      if (params.conditionId && params.conditionId.trim()) {
        whereConditions.push(eq(markets.condition_id, params.conditionId.trim()))
      }

      if (params.search && params.search.trim()) {
        whereConditions.push(ilike(markets.title, `%${params.search.trim()}%`))
      }

      const whereCondition = whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0]

      let totalCount = 0

      const baseQuery = db
        .select({
          condition_id: markets.condition_id,
          title: markets.title,
          slug: markets.slug,
          icon_url: markets.icon_url,
          is_active: markets.is_active,
          is_resolved: markets.is_resolved,
          event_slug: events.slug,
          average_position: sql<number>`AVG(${orders.maker_amount}::numeric)`.as('average_position'),
          total_position_value: sql<number>`SUM(${orders.maker_amount}::numeric)`.as('total_position_value'),
          order_count: count(orders.id).as('order_count'),
          last_activity_at: sql<string>`MAX(${orders.created_at})`.as('last_activity_at'),
        })
        .from(orders)
        .innerJoin(conditions, eq(orders.condition_id, conditions.id))
        .innerJoin(markets, eq(conditions.id, markets.condition_id))
        .innerJoin(events, eq(markets.event_id, events.id))
        .where(whereCondition)
        .groupBy(
          markets.condition_id,
          markets.title,
          markets.slug,
          markets.icon_url,
          markets.is_active,
          markets.is_resolved,
          events.slug,
        )

      const result = params.minAmount && params.minAmount > 0
        ? await baseQuery
            .having(sql`SUM(${orders.maker_amount}::numeric) >= ${params.minAmount}`)
            .orderBy(desc(sql`MAX(${orders.created_at})`))
            .limit(params.limit)
            .offset(params.offset)
        : await baseQuery
            .orderBy(desc(sql`MAX(${orders.created_at})`))
            .limit(params.limit)
            .offset(params.offset)

      const positions: UserPosition[] = result.map((row) => {
        const iconUrl = row.icon_url ? getSupabaseImageUrl(row.icon_url) : ''

        return {
          market: {
            condition_id: row.condition_id,
            title: row.title,
            slug: row.slug,
            icon_url: iconUrl,
            is_active: row.is_active,
            is_resolved: row.is_resolved,
            event: {
              slug: row.event_slug || '',
            },
          },
          average_position: typeof row.average_position === 'string'
            ? Number.parseFloat(row.average_position)
            : (row.average_position || 0),
          total_position_value: typeof row.total_position_value === 'string'
            ? Number.parseFloat(row.total_position_value)
            : (row.total_position_value || 0),
          order_count: typeof row.order_count === 'string'
            ? Number.parseInt(row.order_count, 10)
            : (row.order_count || 0),
          last_activity_at: typeof row.last_activity_at === 'string'
            ? row.last_activity_at
            : (row.last_activity_at ? new Date(row.last_activity_at).toISOString() : ''),
        }
      })

      const hasMore = positions.length === params.limit

      totalCount = params.offset + positions.length + (hasMore ? 1 : 0)

      return {
        data: {
          data: positions,
          hasMore,
          total: totalCount,
        },
        error: null,
      }
    })
  },

  async getUserOutcomePositionsByEvent(args: { userId: string, eventSlug: string }): Promise<QueryResult<UserMarketOutcomePosition[]>> {
    return await runQuery(async () => {
      const rows = await db
        .select({
          condition_id: v_user_outcome_positions.condition_id,
          token_id: v_user_outcome_positions.token_id,
          outcome_index: v_user_outcome_positions.outcome_index,
          outcome_text: v_user_outcome_positions.outcome_text,
          shares_micro: v_user_outcome_positions.net_shares_micro,
          order_count: v_user_outcome_positions.order_count,
          last_activity_at: v_user_outcome_positions.last_activity_at,
        })
        .from(v_user_outcome_positions)
        .innerJoin(markets, eq(v_user_outcome_positions.condition_id, markets.condition_id))
        .innerJoin(events, eq(markets.event_id, events.id))
        .where(and(
          eq(v_user_outcome_positions.user_id, args.userId),
          eq(events.slug, args.eventSlug),
        ))

      const data: UserMarketOutcomePosition[] = rows.map(row => ({
        condition_id: row.condition_id,
        token_id: row.token_id,
        outcome_index: typeof row.outcome_index === 'number'
          ? row.outcome_index
          : Number(row.outcome_index || 0),
        outcome_text: row.outcome_text || '',
        shares_micro: typeof row.shares_micro === 'string'
          ? row.shares_micro
          : (row.shares_micro ?? 0).toString(),
        order_count: typeof row.order_count === 'bigint'
          ? Number(row.order_count)
          : Number(row.order_count || 0),
        last_activity_at: row.last_activity_at instanceof Date
          ? row.last_activity_at.toISOString()
          : (row.last_activity_at ? new Date(row.last_activity_at).toISOString() : null),
      })) as UserMarketOutcomePosition[]

      return { data, error: null }
    })
  },
}

function generateUsernameFromAddress(address: string) {
  const normalized = address.toLowerCase()

  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    return null
  }

  const seed = normalized.slice(2)
  const suffixHex = seed.slice(-8) || seed
  const suffixNumber = Number.parseInt(suffixHex, 16)
  const deterministicSuffix = Number.isNaN(suffixNumber) ? 0 : suffixNumber

  return `${normalized}-${deterministicSuffix}`
}

async function ensureUserProxyWallet(user: any): Promise<string | null> {
  const owner = typeof user?.address === 'string' ? user.address : ''
  if (!owner || !owner.startsWith('0x')) {
    return null
  }

  const hasProxyAddress = typeof user?.proxy_wallet_address === 'string' && user.proxy_wallet_address.startsWith('0x')
  const isAlreadyDeployed = hasProxyAddress && user.proxy_wallet_status === 'deployed'

  if (isAlreadyDeployed) {
    return user.proxy_wallet_address
  }

  try {
    const proxyAddress = hasProxyAddress
      ? user.proxy_wallet_address as `0x${string}`
      : await getSafeProxyWalletAddress(owner as `0x${string}`)

    if (!proxyAddress) {
      return null
    }

    let nextStatus: ProxyWalletStatus = (user.proxy_wallet_status as ProxyWalletStatus | null) ?? 'not_started'
    const updates: Record<string, any> = {}

    if (!hasProxyAddress) {
      updates.proxy_wallet_address = proxyAddress
    }

    const shouldCheckDeployment = !hasProxyAddress || user.proxy_wallet_status === 'signed'
    if (shouldCheckDeployment) {
      const deployed = await isProxyWalletDeployed(proxyAddress as `0x${string}`)
      if (deployed) {
        nextStatus = 'deployed'
      }
    }

    if (nextStatus !== user.proxy_wallet_status) {
      updates.proxy_wallet_status = nextStatus
      if (nextStatus === 'deployed') {
        updates.proxy_wallet_tx_hash = null
      }
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(users)
        .set(updates)
        .where(eq(users.id, user.id))
    }

    user.proxy_wallet_address = proxyAddress
    user.proxy_wallet_status = nextStatus
    if (nextStatus === 'deployed') {
      user.proxy_wallet_tx_hash = null
    }

    return proxyAddress
  }
  catch (error) {
    console.error('Failed to ensure proxy wallet metadata', error)
  }

  return null
}
