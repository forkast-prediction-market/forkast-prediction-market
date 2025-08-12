'use cache'

import { supabaseAdmin } from '@/lib/supabase'

export async function getMainTags() {
  const query = supabaseAdmin
    .from('tags')
    .select('name, slug')
    .eq('is_main_category', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  const { data, error } = await query

  if (error)
    throw error

  return data
}

export async function getChildTags(slug: string) {
  const { data: mainTag, error: mainTagError } = await supabaseAdmin
    .from('tags')
    .select('id')
    .eq('slug', slug)
    .single()

  if (mainTagError)
    throw mainTagError

  const query = supabaseAdmin
    .from('tags')
    .select('name, slug')
    .eq('parent_tag_id', mainTag.id)
    .eq('is_main_category', false)
    .order('display_order', { ascending: true })

  const { data, error } = await query

  if (error)
    throw error

  return data
}
