import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user)
    return null

  return session.user
}

export async function updateCurrentUser(userId: string, updates: any) {
  const { data, error } = await supabaseAdmin
    .from('user')
    .update({ ...updates, updatedAt: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      if (error.details?.includes('email')) {
        return { error: { email: 'Email is already taken' } }
      }
      if (error.details?.includes('username')) {
        return { error: { username: 'Username is already taken' } }
      }
    }

    return { error: 'Failed to update user' }
  }

  return data
}
