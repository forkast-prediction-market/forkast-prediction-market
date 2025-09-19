import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
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
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ settings: { notifications: preferences } })
      .eq('id', userId)
      .select('id')
      .single()

    if (error) {
      return { error: 'Failed to update notification preferences.' }
    }

    return { data, error }
  },

  async getCurrentUser() {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return null
    }

    const user = session.user
    if (user.email.includes(process.env.VERCEL_PROJECT_PRODUCTION_URL!) || user.email.includes('vercel.app')) {
      user.email = ''
    }

    return user
  },
}
