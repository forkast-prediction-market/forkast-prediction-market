import { supabaseAdmin } from '@/lib/supabase'

interface ListTagsParams {
  limit?: number
  offset?: number
  search?: string
  sortBy?: 'name' | 'slug' | 'display_order' | 'created_at' | 'updated_at' | 'active_markets_count'
  sortOrder?: 'asc' | 'desc'
}

export const AdminTagModel = {
  async listTags({
    limit = 50,
    offset = 0,
    search,
    sortBy = 'display_order',
    sortOrder = 'asc',
  }: ListTagsParams = {}) {
    const cappedLimit = Math.min(Math.max(limit, 1), 100)
    const safeOffset = Math.max(offset, 0)

    const validSortFields: ListTagsParams['sortBy'][] = [
      'name',
      'slug',
      'display_order',
      'created_at',
      'updated_at',
      'active_markets_count',
    ]
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'display_order'
    const ascending = (sortOrder ?? 'asc') === 'asc'

    let query = supabaseAdmin
      .from('tags')
      .select(`
        id,
        name,
        slug,
        is_main_category,
        is_hidden,
        display_order,
        parent_tag_id,
        active_markets_count,
        created_at,
        updated_at,
        parent:parent_tag_id(
          id,
          name,
          slug
        )
      `, { count: 'exact' })

    if (search && search.trim()) {
      const sanitized = search.trim()
        .replace(/['"]/g, '')
        .replace(/\s+/g, ' ')
      if (sanitized) {
        query = query.or(`name.ilike.%${sanitized}%,slug.ilike.%${sanitized}%`)
      }
    }

    query = query
      .order(orderField, { ascending })
      .order('name', { ascending: true })
      .range(safeOffset, safeOffset + cappedLimit - 1)

    const { data, error, count } = await query

    return {
      data: data ?? [],
      error,
      totalCount: count ?? 0,
    }
  },

  async updateTagById(id: number, updates: Partial<{ is_main_category: boolean, is_hidden: boolean }>) {
    const payload: Record<string, unknown> = {}

    if (Object.prototype.hasOwnProperty.call(updates, 'is_main_category')) {
      payload.is_main_category = updates.is_main_category
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'is_hidden')) {
      payload.is_hidden = updates.is_hidden
    }

    if (Object.keys(payload).length === 0) {
      return {
        data: null,
        error: new Error('No valid fields to update'),
      }
    }

    payload.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('tags')
      .update(payload)
      .eq('id', id)
      .select(`
        id,
        name,
        slug,
        is_main_category,
        is_hidden,
        display_order,
        parent_tag_id,
        active_markets_count,
        created_at,
        updated_at,
        parent:parent_tag_id(
          id,
          name,
          slug
        )
      `)
      .single()

    return { data, error }
  },
}
