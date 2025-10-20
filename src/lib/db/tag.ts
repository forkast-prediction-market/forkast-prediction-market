'use cache'

import type { PostgrestError } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'

const EXCLUDED_SUB_SLUGS = new Set(['hide-from-new'])

interface ListTagsParams {
  limit?: number
  offset?: number
  search?: string
  sortBy?: 'name' | 'slug' | 'display_order' | 'created_at' | 'updated_at' | 'active_markets_count'
  sortOrder?: 'asc' | 'desc'
}

interface ParentTagPreview {
  id: number
  name: string
  slug: string
}

interface AdminTagRow {
  id: number
  name: string
  slug: string
  is_main_category: boolean
  is_hidden: boolean
  display_order: number
  parent_tag_id: number | null
  active_markets_count: number
  created_at: string
  updated_at: string
  parent?: ParentTagPreview | null
}

export const TagRepository = {
  async getMainTags() {
    const query = supabaseAdmin
      .from('tags')
      .select(`
        id,
        name,
        slug,
        is_hidden,
        is_main_category,
        display_order,
        childs:tags!parent_tag_id(
          id,
          name,
          slug,
          is_hidden,
          is_main_category
        )
      `)
      .eq('is_main_category', true)
      .eq('is_hidden', false)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    const { data, error } = await query

    if (error || !data) {
      return { data, error, globalChilds: [] }
    }

    const mainVisibleTags = data.filter(tag => !tag.is_hidden)
    const mainSlugs = mainVisibleTags.map(tag => tag.slug)
    const mainSlugSet = new Set(mainSlugs)

    const { data: subcategories, error: viewError } = await supabaseAdmin
      .from('v_main_tag_subcategories')
      .select('main_tag_slug, sub_tag_name, sub_tag_slug, active_markets_count, sub_tag_is_hidden, main_tag_is_hidden')
      .in('main_tag_slug', mainSlugs)

    if (viewError || !subcategories) {
      return { data: mainVisibleTags, error: viewError, globalChilds: [] }
    }

    const grouped = new Map<string, { name: string, slug: string, count: number }[]>()
    const bestMainBySubSlug = new Map<string, { mainSlug: string, count: number }>()
    const globalCounts = new Map<string, { name: string, slug: string, count: number }>()

    for (const subtag of subcategories) {
      if (
        !subtag.sub_tag_slug
        || mainSlugSet.has(subtag.sub_tag_slug)
        || EXCLUDED_SUB_SLUGS.has(subtag.sub_tag_slug)
        || subtag.sub_tag_is_hidden
        || subtag.main_tag_is_hidden
      ) {
        continue
      }

      const current = grouped.get(subtag.main_tag_slug) ?? []
      const existingIndex = current.findIndex(item => item.slug === subtag.sub_tag_slug)
      const nextCount = subtag.active_markets_count ?? 0

      if (existingIndex >= 0) {
        current[existingIndex] = {
          name: subtag.sub_tag_name,
          slug: subtag.sub_tag_slug,
          count: Math.max(current[existingIndex].count, nextCount),
        }
      }
      else {
        current.push({
          name: subtag.sub_tag_name,
          slug: subtag.sub_tag_slug,
          count: nextCount,
        })
      }

      grouped.set(subtag.main_tag_slug, current)

      const best = bestMainBySubSlug.get(subtag.sub_tag_slug)
      if (
        !best
        || nextCount > best.count
        || (nextCount === best.count && subtag.main_tag_slug.localeCompare(best.mainSlug) < 0)
      ) {
        bestMainBySubSlug.set(subtag.sub_tag_slug, {
          mainSlug: subtag.main_tag_slug,
          count: nextCount,
        })
      }

      const globalExisting = globalCounts.get(subtag.sub_tag_slug)
      globalCounts.set(subtag.sub_tag_slug, {
        name: subtag.sub_tag_name,
        slug: subtag.sub_tag_slug,
        count: (globalExisting?.count ?? 0) + nextCount,
      })
    }

    const enhanced = mainVisibleTags.map(tag => ({
      ...tag,
      childs: (grouped.get(tag.slug) ?? [])
        .filter(child => bestMainBySubSlug.get(child.slug)?.mainSlug === tag.slug)
        .sort((a, b) => {
          if (b.count === a.count) {
            return a.name.localeCompare(b.name)
          }
          return b.count - a.count
        })
        .slice(0, 6)
        .map(({ name, slug }) => ({ name, slug })),
    }))

    const globalChilds = Array.from(globalCounts.values())
      .sort((a, b) => {
        if (b.count === a.count) {
          return a.name.localeCompare(b.name)
        }
        return b.count - a.count
      })
      .slice(0, 6)
      .map(({ name, slug }) => ({ name, slug }))

    return { data: enhanced, error: null, globalChilds }
  },

  async listTags({
    limit = 50,
    offset = 0,
    search,
    sortBy = 'display_order',
    sortOrder = 'asc',
  }: ListTagsParams = {}): Promise<{
    data: AdminTagRow[]
    error: PostgrestError | null
    totalCount: number
  }> {
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
        hide_events,
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
      data: (data as AdminTagRow[] | null) ?? [],
      error,
      totalCount: count ?? 0,
    }
  },

  async updateTagById(id: number, payload: any) {
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

    revalidatePath('/')

    return { data: data as AdminTagRow | null, error }
  },

}
