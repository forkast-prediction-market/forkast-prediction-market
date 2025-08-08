import { supabaseAdmin } from '@/lib/supabase'

export async function getTags() {
  const query = supabaseAdmin
    .from('tags')
    .select('*')
    .eq('is_main_category', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  const { data, error } = await query

  if (error)
    throw error

  return data
}
