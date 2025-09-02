'use cache'

import { supabaseAdmin } from '@/lib/supabase'

export const TagModel = {
  async getMainTags() {
    const query = supabaseAdmin
      .from('tags')
      .select(`
      name,
      slug,
      childs:tags!parent_tag_id(name, slug)
    `)
      .eq('is_main_category', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    const { data, error } = await query

    return { data, error }
  },
}
