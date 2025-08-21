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
    .update({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`)
  }

  return data
}
