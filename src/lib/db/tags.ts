'use cache'

import { supabaseAdmin } from '@/lib/supabase'

export async function getMainTags() {
  const query = supabaseAdmin
    .from('tags')
    .select('name, slug, childs:tags!parent_tag_id(name, slug)')
    .eq('is_main_category', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  const { data, error } = await query

  if (error)
    throw error

  return data
}

export async function getChildTags(slug: string) {
  const { data: tag, error: tagError } = await supabaseAdmin
    .from('tags')
    .select('id, slug, parent_tag_id')
    .eq('slug', slug)
    .maybeSingle()

  if (tagError)
    throw tagError

  if (tag === null) {
    return []
  }

  const query = supabaseAdmin
    .from('tags')
    .select('name, slug')
    .eq('parent_tag_id', tag.parent_tag_id ?? tag.id)
    .order('display_order', { ascending: true })

  const { data, error } = await query

  if (error)
    throw error

  return data?.map(item => ({
    ...item,
    parent: tag.slug,
  }))
}
