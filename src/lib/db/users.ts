import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function getProfileByUsername(username: string) {
  'use cache'

  const { data } = await supabaseAdmin
    .from('users')
    .select('address, username, image, created_at')
    .or(`username.eq.${username},address.eq.${username}`)
    .maybeSingle()

  return data
}

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return null
  }

  const user = session.user
  if (user.email.startsWith('0x') && user.email.includes('@http')) {
    user.email = ''
  }

  return user
}

export async function updateUserProfileById(userId: string, input: any) {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ ...input })
    .eq('id', userId)
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      if (error.details?.includes('email')) {
        return { error: { email: 'Email is already taken.' } }
      }
      if (error.details?.includes('username')) {
        return { error: { username: 'Username is already taken.' } }
      }
    }

    return { error: 'Failed to update user.' }
  }

  return {}
}

export async function updateUserNotificationPreferencesById(userId: string, preferences: any) {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ settings: { notifications: preferences } })
    .eq('id', userId)
    .select('id')
    .single()

  if (error) {
    return { error: 'Failed to update notification preferences.' }
  }

  return {}
}
