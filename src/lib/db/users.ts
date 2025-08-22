import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function getProfileByUsername(username: string) {
  'use cache'

  const { data } = await supabaseAdmin
    .from('user')
    .select('name, username, image, createdAt')
    .or(`username.eq.${username},name.eq.${username}`)
    .maybeSingle()

  if (data) {
    return {
      ...data,
      address: data.name,
      created_at: data.createdAt,
    }
  }

  return data
}

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return null
  }

  return {
    ...session.user,
    address: session.user.name,
  }
}

export async function updateCurrentUser(userId: string, input: any) {
  const { data, error } = await supabaseAdmin
    .from('user')
    .update({ ...input, updatedAt: new Date().toISOString() })
    .eq('id', userId)
    .select('id')
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
