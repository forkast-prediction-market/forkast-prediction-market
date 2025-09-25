import { cookies, headers } from 'next/headers'
import { isAdminWallet } from '@/lib/admin'
import { auth } from '@/lib/auth'
import { AffiliateModel } from '@/lib/db/affiliates'
import { supabaseAdmin } from '@/lib/supabase'

export const UserModel = {
  async getProfileByUsername(username: string) {
    'use cache'

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('address, username, image, created_at')
      .or(`username.eq.${username},address.eq.${username}`)
      .single()

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

    user.is_admin = isAdminWallet(user.address)

    if (!user.affiliate_code) {
      try {
        const { data: code } = await AffiliateModel.ensureUserAffiliateCode(user.id)
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
        const referralCookie
          = cookieStore.get('platform_affiliate')
            ?? cookieStore.get('fork_affiliate')

        if (referralCookie?.value) {
          const parsed = JSON.parse(referralCookie.value) as {
            affiliateUserId?: string
            timestamp?: number
          }

          if (parsed?.affiliateUserId) {
            await AffiliateModel.recordReferral({
              user_id: user.id,
              affiliate_user_id: parsed.affiliateUserId,
              source: 'cookie',
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

  async listUsers(limit = 100) {
    const { data, error, count } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        username,
        email,
        address,
        created_at,
        image,
        affiliate_code,
        referred_by_user_id,
        referred_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)

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
}
