'use cache'

import { supabaseAdmin } from '@/lib/supabase'

const EXCLUDED_SUB_SLUGS = new Set(['hide-from-new'])

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

    if (error || !data) {
      return { data, error, globalChilds: [] }
    }

    const mainSlugs = data.map(tag => tag.slug)
    const mainSlugSet = new Set(mainSlugs)

    const { data: subcategories, error: viewError } = await supabaseAdmin
      .from('v_main_tag_subcategories')
      .select('main_tag_slug, sub_tag_name, sub_tag_slug, active_markets_count')
      .in('main_tag_slug', mainSlugs)

    if (viewError || !subcategories) {
      return { data, error: viewError, globalChilds: [] }
    }

    const grouped = new Map<string, { name: string, slug: string, count: number }[]>()
    const bestMainBySubSlug = new Map<string, { mainSlug: string, count: number }>()
    const globalCounts = new Map<string, { name: string, slug: string, count: number }>()

    for (const subtag of subcategories) {
      if (
        !subtag.sub_tag_slug
        || mainSlugSet.has(subtag.sub_tag_slug)
        || EXCLUDED_SUB_SLUGS.has(subtag.sub_tag_slug)
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

    const enhanced = data.map(tag => ({
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
}
