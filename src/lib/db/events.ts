import type { Event, EventCategory, Tag } from '@/types'
import { getSupabaseImageUrl, supabaseAdmin } from '@/lib/supabase'

interface ListEventsProps {
  tag: string
  search?: string
  userId?: string | undefined
  bookmarked?: boolean
}

export const EventModel = {
  async listEvents({
    tag = 'trending',
    search = '',
    userId = '',
    bookmarked = false,
  }: ListEventsProps) {
    const marketsSelect = `
    markets!inner(
      condition_id,
      name,
      slug,
      description,
      short_title,
      outcome_count,
      icon_url,
      is_active,
      is_resolved,
      current_volume_24h,
      total_volume,
      open_interest,
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

    query.order('created_at', { ascending: false }).limit(20)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      throw error
    }

    const events = data?.map(event => eventResource(event, userId)) || []

    if (!bookmarked && tag === 'trending') {
      return events.filter(market => market.isTrending)
    }

    if (tag === 'new') {
      return events.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    }

    return events
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
          name,
          slug,
          description,
          short_title,
          outcome_count,
          icon_url,
          is_active,
          is_resolved,
          current_volume_24h,
          total_volume,
          open_interest,
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

    const event = eventResource(data, userId) as Event & any

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

function eventResource(data: any, userId: string): Event {
  const event = {
    ...data,
    tags: data.event_tags?.map((et: any) => et.tag?.slug).filter(Boolean) || [],
    markets: data.markets.map((market: any) => ({
      ...market,
      oracle: market.conditions?.oracle,
      outcomes: market.conditions?.outcomes || [],
    })),
    is_bookmarked: data.bookmarks?.some((bookmark: any) => bookmark.user_id === userId) || false,
  }

  if (event.active_markets_count === 1) {
    const market = event.markets[0]
    const outcomes = market.outcomes.map((outcome: any) => ({
      id: `${event.id}-${outcome.outcome_index}`,
      name: outcome.outcome_text,
      probability: Math.random() * 100,
      price: Math.random() * 0.99 + 0.01,
      volume: Math.random() * 100000,
      isYes: outcome.outcome_index === 0,
      avatar: `https://avatar.vercel.sh/${outcome.outcome_text.toLowerCase()}.png`,
      outcome_index: outcome.outcome_index,
    }))

    return {
      id: event.id,
      active_markets_count: event.active_markets_count,
      slug: event.slug,
      title: market.short_title || market.name,
      description: market.description || event.description || '',
      category: getCategoryFromTags(event.tags),
      probability: outcomes[0]?.probability || 50,
      volume: Math.random() * 1000000,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isResolved: market.is_resolved,
      isTrending: Math.random() > 0.3,
      creator: '0x1234...5678',
      icon_url: getSupabaseImageUrl(event.icon_url),
      creatorAvatar: getSupabaseImageUrl(event.icon_url),
      tags: event.tags,
      outcomes,
      show_market_icons: event.show_market_icons,
      rules: event.rules || undefined,
      oracle: event.markets[0]?.oracle || null,
      is_bookmarked: event.is_bookmarked,
      created_at: event.created_at,
      condition_id: market.condition_id,
    }
  }

  const outcomes = event.markets.map((market: any) => ({
    id: `${event.id}-${market.slug}`,
    name: market.short_title || market.name,
    probability: Math.random() * 100,
    price: Math.random() * 0.99 + 0.01,
    volume: Math.random() * 100000,
    avatar: getSupabaseImageUrl(market.icon_url),
  }))

  return {
    id: event.id,
    active_markets_count: event.active_markets_count,
    slug: event.slug,
    title: event.title,
    description: event.description || '',
    category: event.tags[0] || 'world',
    probability: 0,
    volume: Math.random() * 1000000,
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isResolved: false,
    isTrending: Math.random() > 0.3,
    creator: '0x1234...5678',
    icon_url: getSupabaseImageUrl(event.icon_url),
    creatorAvatar: getSupabaseImageUrl(event.icon_url),
    tags: event.tags,
    outcomes,
    show_market_icons: event.show_market_icons,
    rules: event.rules || undefined,
    is_bookmarked: event.is_bookmarked,
    created_at: event.created_at,
    condition_id: event.markets[0].condition_id,
  }
}

function getCategoryFromTags(tags: Tag[]): EventCategory {
  const mainTag = tags.find(tag => tag.is_main_category)

  if (mainTag) {
    return mainTag.slug
  }

  if (tags.length > 0) {
    return tags[0].slug
  }

  return 'world'
}
