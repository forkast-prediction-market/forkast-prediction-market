'use cache'

import { getSupabaseImageUrl } from '@/lib/mockData'
import { supabaseAdmin } from '@/lib/supabase'

export async function index(slug: string) {
  const { data: currentEvent, error: errorEvent } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('slug', slug)
    .single()

  if (errorEvent || !currentEvent) {
    throw errorEvent || new Error('Event not found')
  }

  const { data: currentTags, error: errorTags } = await supabaseAdmin
    .from('event_tags')
    .select('tag_id')
    .eq('event_id', currentEvent.id)

  if (errorTags) {
    throw errorTags
  }

  const currentTagIds = currentTags?.map(t => t.tag_id) || []
  if (currentTagIds.length === 0) {
    return []
  }

  const { data: relatedEvents, error } = await supabaseAdmin
    .from('events')
    .select(`
      id,
      slug,
      title,
      markets!inner(
        icon_url
      ),
      event_tags!inner(
        tag_id
      )
    `)
    .neq('slug', slug)
    .in('event_tags.tag_id', currentTagIds)
    .limit(20)

  if (error) {
    throw error
  }

  return (relatedEvents || [])
    .filter(event => event.markets.length === 1)
    .map((event) => {
      const eventTagIds = event.event_tags.map(et => et.tag_id)
      const commonTagsCount = eventTagIds.filter(t => currentTagIds.includes(t)).length

      return {
        id: event.id,
        slug: event.slug,
        title: event.title,
        icon_url: getSupabaseImageUrl(`${event.markets[0].icon_url}`),
        common_tags_count: commonTagsCount,
      }
    })
    .filter(event => event.common_tags_count > 0)
    .sort((a, b) => b.common_tags_count - a.common_tags_count)
    .slice(0, 3)
}
