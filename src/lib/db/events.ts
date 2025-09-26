import type { Event, Tag } from '@/types'
import { getSupabaseImageUrl, supabaseAdmin } from '@/lib/supabase'

const HIDE_FROM_NEW_TAG_SLUG = 'hide-from-new'

interface ListEventsProps {
  tag: string
  search?: string
  userId?: string | undefined
  bookmarked?: boolean
  offset?: number
}

export const EventModel = {
  async listEvents({
    tag = 'trending',
    search = '',
    userId = '',
    bookmarked = false,
    offset = 0,
  }: ListEventsProps) {
    const marketsSelect = `
      markets!inner(
        condition_id,
        title,
        short_title,
        slug,
        icon_url,
        is_active,
        is_resolved,
        current_volume_24h,
        total_volume,
        condition:conditions!markets_condition_id_fkey(
          oracle,
          outcomes(*)
        )
      )
    `

    const tagsSelect = `
      event_tags!inner(
        tag:tags!inner(
          id,
          name,
          slug,
          is_main_category
        )
      )
    `

    const selectString = bookmarked && userId
      ? `*, bookmarks!inner(user_id), ${marketsSelect}, ${tagsSelect}`
      : `*, bookmarks(user_id), ${marketsSelect}, ${tagsSelect}`

    const query = supabaseAdmin.from('events').select(selectString)

    if (bookmarked && userId) {
      query.eq('bookmarks.user_id', userId)
    }

    if (tag && tag !== 'trending' && tag !== 'new') {
      query.eq('event_tags.tag.slug', tag)
    }

    if (search) {
      query.ilike('title', `%${search}%`)
    }

    const limit = 25
    const validOffset = Number.isNaN(offset) || offset < 0 ? 0 : offset
    query.order('id', { ascending: false }).range(validOffset, validOffset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return { data, error }
    }

    const events = data?.map(event => eventResource(event, userId)) || []

    const sanitizedEvents = tag === 'new'
      ? events.filter(event => !event.tags.includes(HIDE_FROM_NEW_TAG_SLUG))
      : events

    if (!bookmarked && tag === 'trending') {
      const trendingEvents = sanitizedEvents.filter(event => event.is_trending)
      return { data: trendingEvents, error }
    }

    if (tag === 'new') {
      const newEvents = sanitizedEvents.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      return { data: newEvents, error }
    }

    return { data: sanitizedEvents, error }
  },

  async getIdBySlug(slug: string) {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single()

    return { data, error }
  },

  async getEventTitleBySlug(slug: string) {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('title')
      .eq('slug', slug)
      .single()

    return { data, error }
  },

  async getEventBySlug(slug: string, userId: string = '') {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select(`
        *,
        bookmarks(user_id),
        markets!inner(
          condition_id,
          title,
          short_title,
          slug,
          icon_url,
          is_active,
          is_resolved,
          current_volume_24h,
          total_volume,
          condition:conditions!markets_condition_id_fkey(
            oracle,
            outcomes(*)
          )
        ),
        event_tags(
          tag:tags(
            id,
            name,
            slug,
            is_main_category
          )
        )
      `)
      .eq('slug', slug)
      .single()

    if (error) {
      return { data, error }
    }

    const event = eventResource(data, userId)

    return { data: event, error }
  },

  async getRelatedEventsBySlug(slug: string) {
    'use cache'

    const { data: currentEvent, error: errorEvent } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single()

    if (errorEvent) {
      return { data: currentEvent, error: 'Could not retrieve event by slug.' }
    }

    const { data: currentTags, error: errorTags } = await supabaseAdmin
      .from('event_tags')
      .select('tag_id')
      .eq('event_id', currentEvent.id)

    if (errorTags) {
      return { data: currentTags, error: 'Could not retrieve tags.' }
    }

    const currentTagIds = currentTags?.map(t => t.tag_id) || []
    if (currentTagIds.length === 0) {
      return { data: [], error: null }
    }

    const { data: relatedEvents, error: errorRelatedEvents } = await supabaseAdmin
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

    if (errorRelatedEvents) {
      return { data: null, error: 'Could not retrieve related event.' }
    }

    const response = (relatedEvents || [])
      .filter(event => event.markets.length === 1)
      .map((event) => {
        const eventTagIds = event.event_tags.map(et => et.tag_id)
        const commonTagsCount = eventTagIds.filter(t => currentTagIds.includes(t)).length

        return {
          id: event.id,
          slug: event.slug,
          title: event.title,
          icon_url: getSupabaseImageUrl(event.markets[0].icon_url),
          common_tags_count: commonTagsCount,
        }
      })
      .filter(event => event.common_tags_count > 0)
      .sort((a, b) => b.common_tags_count - a.common_tags_count)
      .slice(0, 3)

    return { data: response, error: null }
  },
}

function eventResource(event: Event & any, userId: string): Event {
  return {
    ...event,
    markets: event.markets.map((market: any) => ({
      ...market,
      title: market.short_title || market.title,
      probability: Math.random() * 100,
      price: Math.random() * 0.99 + 0.01,
      volume: Math.random() * 100000,
      outcomes: market.condition?.outcomes || [],
      icon_url: getSupabaseImageUrl(market.icon_url),
    })),
    tags: event.event_tags?.map((et: any) => et.tag?.slug).filter(Boolean) || [],
    icon_url: getSupabaseImageUrl(event.icon_url),
    main_tag: getEventMainTag(event.tags),
    is_bookmarked: event.bookmarks?.some((bookmark: any) => bookmark.user_id === userId) || false,
    is_trending: Math.random() > 0.3,
  }
}

function getEventMainTag(tags: Tag[] | undefined): string {
  if (tags) {
    const mainTag = tags?.find(tag => tag.is_main_category)

    if (mainTag) {
      return mainTag.name
    }

    if (tags.length > 0) {
      return tags[0].name
    }
  }

  return 'World'
}
