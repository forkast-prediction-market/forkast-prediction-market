import type { Event, Tag } from '@/types'
import { getSupabaseImageUrl, supabaseAdmin } from '@/lib/supabase'

interface ListEventsProps {
  tag: string
  search?: string
  userId?: string | undefined
  bookmarked?: boolean
  offset?: number
  limit?: number
}

interface ListEventsWithPaginationProps extends ListEventsProps {
  offset?: number
  limit?: number
}

interface ListEventsWithPaginationResponse {
  data: Event[]
  error: any
  hasMore: boolean
  total: number
}

export const EventModel = {
  async listEvents({
    tag = 'trending',
    search = '',
    userId = '',
    bookmarked = false,
    offset,
    limit,
  }: ListEventsProps) {
    // If offset and limit are provided, use the pagination method
    if (offset !== undefined && limit !== undefined) {
      return this.listEventsWithPagination({
        tag,
        search,
        userId,
        bookmarked,
        offset,
        limit,
      })
    }
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
        conditions!markets_condition_id_fkey(
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

    const selectString
      = bookmarked && userId
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

    query.order('created_at', { ascending: false }).limit(20)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return { data, error }
    }

    const events = data?.map(event => eventResource(event, userId)) || []

    if (!bookmarked && tag === 'trending') {
      const trendingEvents = events.filter(event => event.is_trending)
      return { data: trendingEvents, error }
    }

    if (tag === 'new') {
      const newEvents = events.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      return { data: newEvents, error }
    }

    return { data: events, error }
  },

  async listEventsWithPagination({
    tag = 'trending',
    search = '',
    userId = '',
    bookmarked = false,
    offset = 0,
    limit = 20,
  }: ListEventsWithPaginationProps): Promise<ListEventsWithPaginationResponse> {
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
        conditions!markets_condition_id_fkey(
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

    const selectString
      = bookmarked && userId
        ? `*, bookmarks!inner(user_id), ${marketsSelect}, ${tagsSelect}`
        : `*, bookmarks(user_id), ${marketsSelect}, ${tagsSelect}`

    // For simplicity and to avoid complex join counting issues,
    // we'll use a more robust approach for counting
    let totalCount = 0

    try {
      // Get a simple count without complex joins for basic estimation
      const { count, error: countError } = await supabaseAdmin
        .from('events')
        .select('*', { count: 'exact', head: true })

      if (countError) {
        console.warn('Error getting basic count:', countError)
        totalCount = 1000 // Fallback estimate
      }
      else {
        totalCount = count || 0
      }
    }
    catch (error) {
      console.warn('Count query failed, using fallback:', error)
      totalCount = 1000 // Fallback estimate
    }

    // Then get the actual data with pagination
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

    query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return { data: [], error, hasMore: false, total: totalCount || 0 }
    }

    let events = data?.map(event => eventResource(event, userId)) || []
    let total = totalCount || 0

    // Handle special filtering for trending and new events
    if (!bookmarked && tag === 'trending') {
      events = events.filter(event => event.is_trending)
      // For trending, we need to recalculate total based on filtered results
      // This is a simplified approach - in production you might want to optimize this
      try {
        const allTrendingQuery = supabaseAdmin
          .from('events')
          .select(selectString)
        if (search) {
          allTrendingQuery.ilike('title', `%${search}%`)
        }
        const { data: allEvents } = await allTrendingQuery
        const allTrendingEvents
          = allEvents
            ?.map(event => eventResource(event, userId))
            .filter(event => event.is_trending) || []
        total = allTrendingEvents.length
      }
      catch (trendingError) {
        // If trending calculation fails, use original total
        console.warn('Failed to calculate trending total:', trendingError)
      }
    }

    if (tag === 'new') {
      events = events.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    }

    // Calculate hasMore - if we got fewer events than requested, we're at the end
    // This is more reliable than relying on total count with complex filters
    const hasMore = events.length === limit

    return {
      data: events,
      error: null,
      hasMore,
      total,
    }
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
      .select(
        `
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
          conditions!markets_condition_id_fkey(
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
      `,
      )
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

    const { data: relatedEvents, error: errorRelatedEvents }
      = await supabaseAdmin
        .from('events')
        .select(
          `
        id,
        slug,
        title,
        markets!inner(
          icon_url
        ),
        event_tags!inner(
          tag_id
        )
      `,
        )
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
        const commonTagsCount = eventTagIds.filter(t =>
          currentTagIds.includes(t),
        ).length

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
      outcomes: market.conditions?.outcomes || [],
      icon_url: getSupabaseImageUrl(market.icon_url),
    })),
    tags:
      event.event_tags?.map((et: any) => et.tag?.slug).filter(Boolean) || [],
    icon_url: getSupabaseImageUrl(event.icon_url),
    main_tag: getEventMainTag(event.tags),
    is_bookmarked:
      event.bookmarks?.some((bookmark: any) => bookmark.user_id === userId)
      || false,
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
