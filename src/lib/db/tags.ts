import { supabaseAdmin } from '@/lib/supabase'

export async function getTags(mainOnly = false) {
  let query = supabaseAdmin
    .from('tags')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (mainOnly) {
    query = query.eq('is_main_category', true)
  }

  const { data, error } = await query

  if (error)
    throw error

  return data
}
