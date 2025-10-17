import type { ActivityOrder, Event, QueryResult, Tag, TopHolder } from '@/types'
import { unstable_cacheTag as cacheTag } from 'next/cache'
import { cacheTags } from '@/lib/cache-tags'
import { getSupabaseImageUrl, supabaseAdmin } from '@/lib/supabase'

const HIDE_FROM_NEW_TAG_SLUG = 'hide-from-new'

interface ListEventsProps {
  tag: string
  search?: string
  userId?: string | undefined
  bookmarked?: boolean
  offset?: number
}

export const EventRepository = {
  async listEvents({
    tag = 'trending',
    search = '',
    userId = '',
    bookmarked = false,
    offset = 0,
  }: ListEventsProps) {
    'use cache'
    cacheTag(cacheTags.events(userId))

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
        created_at,
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
    'use cache'

    const { data, error } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single()

    return { data, error }
  },

  async getEventTitleBySlug(slug: string) {
    'use cache'

    const { data, error } = await supabaseAdmin
      .from('events')
      .select('title')
      .eq('slug', slug)
      .single()

    return { data, error }
  },

  async getEventBySlug(slug: string, userId: string = '') {
    'use cache'

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
          created_at,
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

    cacheTag(cacheTags.event(`${event.id}:${userId}`))

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

  async getEventActivity(args: {
    slug: string
    limit: number
    offset: number
    minAmount?: number
  }): Promise<QueryResult<ActivityOrder[]>> {
    let query = supabaseAdmin
      .from('orders')
      .select(`
        id,
        side,
        amount,
        price,
        created_at,
        status,
        user:users!orders_user_id_fkey (
          id,
          username,
          address,
          image
        ),
        outcome:outcomes!orders_token_id_fkey (
          outcome_text,
          outcome_index,
          token_id
        ),
        condition:conditions!orders_condition_id_fkey (
          market:markets!markets_condition_id_fkey (
            title,
            slug,
            event:events!markets_event_id_fkey (
              slug
            )
          )
        )
      `)
      .eq('condition.market.event.slug', args.slug)
      .order('id', { ascending: false })
      .range(args.offset, args.offset + args.limit - 1)

    if (args.minAmount && args.minAmount > 0) {
      query = query.range(args.offset, args.offset + args.limit * 2 - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching event activity:', error)
      return { data: null, error }
    }

    if (!data) {
      return { data: [], error: null }
    }

    let activities: ActivityOrder[] = data
      .filter((order: any) => order.user && order.outcome && order.condition?.market?.event)
      .map((order: any) => {
        const totalValue = order.amount * (order.price ?? 0.5)

        return {
          id: order.id,
          user: {
            id: order.user.id,
            username: order.user.username,
            address: order.user.address,
            image: order.user.image
              ? getSupabaseImageUrl(order.user.image)
              : `https://avatar.vercel.sh/${order.user.address}.png`,
          },
          side: order.side,
          amount: order.amount,
          price: order.price,
          outcome: {
            index: order.outcome.outcome_index,
            text: order.outcome.outcome_text,
          },
          market: {
            title: order.condition.market.title,
            slug: order.condition.market.slug,
            icon_url: order.condition.market.icon_url,
          },
          total_value: totalValue,
          created_at: order.created_at,
          status: order.status,
        }
      })

    if (args.minAmount && args.minAmount > 0) {
      const minAmount = args.minAmount
      activities = activities.filter(activity => activity.total_value >= minAmount)
      activities = activities.slice(0, args.limit)
    }

    return { data: activities, error: null }
  },

  async getEventTopHolders(eventSlug: string, conditionId?: string | null): Promise<QueryResult<{
    yesHolders: TopHolder[]
    noHolders: TopHolder[]
  }>> {
    const { data: holdersData, error: holdersError } = await supabaseAdmin.rpc('get_event_top_holders', {
      event_slug_arg: eventSlug,
      condition_id_arg: conditionId,
      limit_arg: 10,
    })

    if (holdersError) {
      console.error('Error fetching top holders:', holdersError)
      return { data: null, error: holdersError }
    }

    if (!holdersData || holdersData.length === 0) {
      return { data: { yesHolders: [], noHolders: [] }, error: null }
    }

    const yesHolders: TopHolder[] = []
    const noHolders: TopHolder[] = []

    holdersData.forEach((holder: any) => {
      const topHolder: TopHolder = {
        user: {
          id: holder.user_id,
          username: holder.username,
          address: holder.address,
          image: holder.image ? getSupabaseImageUrl(holder.image) : `https://avatar.vercel.sh/${holder.address}.png`,
        },
        netPosition: holder.net_position,
        outcomeIndex: holder.outcome_index,
        outcomeText: holder.outcome_text,
      }

      if (holder.outcome_index === 0) {
        yesHolders.push(topHolder)
      }
      else if (holder.outcome_index === 1) {
        noHolders.push(topHolder)
      }
    })

    return { data: { yesHolders, noHolders }, error: null }
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
      volume: Math.random() * 100_000,
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
