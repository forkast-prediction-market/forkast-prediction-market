import type { ActivityOrder, QueryResult } from '@/types'
import { cookies, headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AffiliateRepository } from '@/lib/db/affiliate'
import { getSupabaseImageUrl, supabaseAdmin } from '@/lib/supabase'

export const UserRepository = {
  async getProfileByUsername(username: string) {
    'use cache'

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, address, username, image, created_at')
      .or(`username.eq.${username},address.eq.${username}`)
      .single()

    if (data) {
      data.image = data.image ? getSupabaseImageUrl(data.image) : `https://avatar.vercel.sh/${data.address}.png`
    }

    return { data, error }
  },

  async updateUserProfileById(userId: string, input: any) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ ...input })
      .eq('id', userId)
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        if (error.details?.includes('email')) {
          return { data, error: { email: 'Email is already taken.' } }
        }
        if (error.details?.includes('username')) {
          return { data, error: { username: 'Username is already taken.' } }
        }
      }

      return { data, error: 'Failed to update user.' }
    }

    return { data, error }
  },

  async updateUserNotificationPreferencesById(userId: string, preferences: any) {
    const { data: currentSettings } = await supabaseAdmin
      .from('users')
      .select('settings')
      .eq('id', userId)
      .single()

    let settingsPayload: any = currentSettings?.settings ?? {}

    if (typeof settingsPayload === 'string') {
      try {
        settingsPayload = JSON.parse(settingsPayload)
      }
      catch {
        settingsPayload = {}
      }
    }

    const mergedSettings = {
      ...settingsPayload,
      notifications: preferences,
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ settings: mergedSettings })
      .eq('id', userId)
      .select('id')
      .single()

    if (error) {
      return { error: 'Failed to update notification preferences.' }
    }

    return { data, error }
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

    const {
      limit = 100,
      offset = 0,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = params

    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        username,
        email,
        address,
        created_at,
        image,
        affiliate_code,
        referred_by_user_id
      `, { count: 'exact' })

    if (search && search.trim()) {
      const searchTerm = search.trim()
      const sanitizedSearchTerm = searchTerm
        .replace(/[,()]/g, ' ')
        .replace(/['"]/g, '')
        .replace(/\s+/g, ' ')
        .trim()

      if (sanitizedSearchTerm) {
        query = query.or(`username.ilike.%${sanitizedSearchTerm}%,email.ilike.%${sanitizedSearchTerm}%,address.ilike.%${sanitizedSearchTerm}%`)
      }
    }

    if (sortBy === 'username') {
      const ascending = sortOrder === 'asc'
      query = query.order('username', { ascending, nullsFirst: false })
      query = query.order('address', { ascending })
    }
    else {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    return { data, error, count }
  },

  async getUsersByIds(ids: string[]) {
    if (!ids.length) {
      return { data: [], error: null }
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, address, image')
      .in('id', ids)

    return { data, error }
  },

  async getUserActivity(args: {
    address: string
    limit: number
    offset: number
    minAmount?: number
  }): Promise<QueryResult<ActivityOrder[]>> {
    const { data: userData, error: userError } = await this.getProfileByUsername(args.address)

    if (userError || !userData) {
      return { data: null, error: 'User not found' }
    }

    let query = supabaseAdmin
      .from('orders')
      .select(`
        id,
        side,
        amount,
        price,
        created_at,
        status,
        user:users!orders_user_id_fkey (
          id,
          username,
          address,
          image
        ),
        outcome:outcomes!orders_token_id_fkey (
          outcome_text,
          outcome_index,
          token_id
        ),
        condition:conditions!orders_condition_id_fkey (
          market:markets!markets_condition_id_fkey (
            title,
            slug,
            icon_url,
            event:events!markets_event_id_fkey (
              slug,
              show_market_icons
            )
          )
        )
      `)
      .eq('user_id', userData.id)
      .order('id', { ascending: false })
      .range(args.offset, args.offset + args.limit - 1)

    if (args.minAmount && args.minAmount > 0) {
      query = query.range(args.offset, args.offset + args.limit * 2 - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching user activity:', error)
      return { data: null, error }
    }

    if (!data) {
      return { data: [], error: null }
    }

    let activities: ActivityOrder[] = data
      .filter((order: any) => order.user && order.outcome && order.condition?.market?.event)
      .map((order: any) => {
        const totalValue = order.amount * (order.price ?? 0.5)

        return {
          id: order.id,
          user: {
            id: order.user.id,
            username: order.user.username,
            address: order.user.address,
            image: order.user.image
              ? getSupabaseImageUrl(order.user.image)
              : `https://avatar.vercel.sh/${order.user.address}.png`,
          },
          side: order.side,
          amount: order.amount,
          price: order.price,
          outcome: {
            index: order.outcome.outcome_index,
            text: order.outcome.outcome_text,
          },
          market: {
            title: order.condition.market.title,
            slug: order.condition.market.slug,
            icon_url: getSupabaseImageUrl(order.condition.market.icon_url),
            event: {
              slug: order.condition.market.event.slug,
              show_market_icons: order.condition.market.event.show_market_icons,
            },
          },
          total_value: totalValue,
          created_at: order.created_at,
          status: order.status,
        }
      })

    if (args.minAmount && args.minAmount > 0) {
      const minAmount = args.minAmount
      activities = activities.filter(activity => activity.total_value >= minAmount)
      activities = activities.slice(0, args.limit)
    }

    return { data: activities, error: null }
  },
}
