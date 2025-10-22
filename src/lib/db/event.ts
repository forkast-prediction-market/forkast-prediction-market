import type { ActivityOrder, Event, QueryResult, Tag, TopHolder } from '@/types'
import { and, desc, eq, ilike, inArray, ne, sql } from 'drizzle-orm'
import { unstable_cacheTag as cacheTag } from 'next/cache'
import { cacheTags } from '@/lib/cache-tags'
import { db } from '@/lib/drizzle'
import { getSupabaseImageUrl } from '@/lib/supabase'
import {
  bookmarks,
  conditions,
  event_tags,
  events,
  markets,
  orders,
  outcomes,
  tags,
  users,
  vVisibleEvents,
} from './schema'

const HIDE_FROM_NEW_TAG_SLUG = 'hide-from-new'

// TypeScript interfaces for query results
interface ListEventsProps {
  tag: string
  search?: string
  userId?: string | undefined
  bookmarked?: boolean
  offset?: number
}

interface ActivityArgs {
  slug: string
  limit: number
  offset: number
  minAmount?: number
}

interface RelatedEventOptions {
  tagSlug?: string
}

interface HoldersResult {
  yesHolders: TopHolder[]
  noHolders: TopHolder[]
}

// Drizzle result types for complex queries
type DrizzleEventResult = typeof vVisibleEvents.$inferSelect & {
  markets: (typeof markets.$inferSelect & {
    condition: typeof conditions.$inferSelect & {
      outcomes: typeof outcomes.$inferSelect[]
    }
  })[]
  eventTags: (typeof event_tags.$inferSelect & {
    tag: typeof tags.$inferSelect
  })[]
  bookmarks?: typeof bookmarks.$inferSelect[]
}

interface RelatedEvent {
  id: string
  slug: string
  title: string
  icon_url: string
  common_tags_count: number
}

// Query execution wrapper for consistent error handling
async function executeQuery<T>(
  queryFn: () => Promise<T>,
): Promise<QueryResult<T>> {
  try {
    const data = await queryFn()
    return { data, error: null }
  }
  catch (error) {
    console.error('Database query error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}

// Event resource transformation function for Drizzle result types
function eventResource(event: DrizzleEventResult, userId: string): Event {
  const tagRecords: Tag[] = ((event.eventTags ?? []) as any[])
    .map((et: any) => et.tag)
    .filter((tag: any): tag is Tag => Boolean(tag?.slug))

  return {
    id: event.id || '',
    slug: event.slug || '',
    title: event.title || '',
    description: event.rules || '', // Use rules as description since Event interface requires it
    creator: event.creator || '',
    icon_url: getSupabaseImageUrl(event.icon_url),
    show_market_icons: event.show_market_icons ?? true,
    status: (event.status ?? 'draft') as Event['status'],
    rules: event.rules || undefined,
    active_markets_count: Number(event.active_markets_count || 0),
    total_markets_count: Number(event.total_markets_count || 0),
    created_at: event.created_at?.toISOString() || new Date().toISOString(),
    updated_at: event.updated_at?.toISOString() || new Date().toISOString(),
    markets: event.markets.map((market: any) => ({
      ...market,
      question_id: market.condition?.id || '', // Map condition_id to question_id
      title: market.short_title || market.title,
      probability: Math.random() * 100, // Placeholder - should be calculated from real data
      price: Math.random() * 0.99 + 0.01, // Placeholder - should be calculated from real data
      volume: Number(market.total_volume || 0), // Convert string to number
      current_volume_24h: Number(market.current_volume_24h || 0), // Convert string to number
      total_volume: Number(market.total_volume || 0), // Convert string to number
      outcomes: (market.condition?.outcomes || []).map((outcome: any) => ({
        ...outcome,
        outcome_index: Number(outcome.outcome_index || 0),
        payout_value: outcome.payout_value ? Number(outcome.payout_value) : undefined,
        current_price: outcome.current_price ? Number(outcome.current_price) : undefined,
        volume_24h: Number(outcome.volume_24h || 0),
        total_volume: Number(outcome.total_volume || 0),
      })),
      icon_url: getSupabaseImageUrl(market.icon_url),
      condition: market.condition
        ? {
            ...market.condition,
            outcome_slot_count: Number(market.condition.outcome_slot_count || 0),
            payout_denominator: market.condition.payout_denominator ? Number(market.condition.payout_denominator) : undefined,
            total_volume: Number(market.condition.total_volume || 0),
            open_interest: Number(market.condition.open_interest || 0),
            active_positions_count: Number(market.condition.active_positions_count || 0),
          }
        : null,
    })),
    tags: tagRecords.map(tag => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      isMainCategory: tag.is_main_category,
    })),
    main_tag: getEventMainTag(tagRecords),
    is_bookmarked: event.bookmarks?.some((bookmark: any) => bookmark.user_id === userId) || false,
    is_trending: Math.random() > 0.3, // Placeholder - should be calculated from real data
  }
}

// Helper function to get main tag from tag records
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

// Helper function to transform activity order results
function transformActivityOrder(order: any): ActivityOrder {
  // Handle user image URL transformations and apply proper error handling
  const userImage = order.user_image
    ? getSupabaseImageUrl(order.user_image)
    : `https://avatar.vercel.sh/${order.user_address || 'unknown'}.png`

  // Apply proper error handling and null value management
  const amount = order.amount ? Number(order.amount) : 0
  const price = order.price ? Number(order.price) : 0.5
  const totalValue = amount * price

  return {
    id: order.id || '',
    user: {
      id: order.user_id || '',
      username: order.user_username || null,
      address: order.user_address || '',
      image: userImage,
    },
    side: (order.side as 'buy' | 'sell') || 'buy',
    amount,
    price,
    outcome: {
      index: order.outcome_index || 0,
      text: order.outcome_text || '',
    },
    market: {
      title: order.market_title || '',
      slug: order.market_slug || '',
      icon_url: order.market_icon_url || '',
    },
    total_value: totalValue,
    created_at: order.created_at?.toISOString() || new Date().toISOString(),
    status: order.status || '',
  }
}

// Drizzle-based Event Repository
export const EventRepository = {
  async listEvents({
    tag = 'trending',
    search = '',
    userId = '',
    bookmarked = false,
    offset = 0,
  }: ListEventsProps): Promise<QueryResult<Event[]>> {
    'use cache'
    cacheTag(cacheTags.events(userId))

    return executeQuery(async () => {
      // Calculate pagination values
      const limit = 40
      const validOffset = Number.isNaN(offset) || offset < 0 ? 0 : offset

      // Build where conditions
      const whereConditions = [eq(vVisibleEvents.status, 'active')]

      // Add search filtering
      if (search) {
        whereConditions.push(ilike(vVisibleEvents.title, `%${search}%`))
      }

      let baseResults: any[] = []

      // Handle different query types based on filtering needs
      if (tag && tag !== 'trending' && tag !== 'new') {
        // Need to filter by tag - DON'T join with markets here, just get events with the tag
        let tagQuery = db
          .select({
            id: vVisibleEvents.id,
            slug: vVisibleEvents.slug,
            title: vVisibleEvents.title,
            creator: vVisibleEvents.creator,
            icon_url: vVisibleEvents.icon_url,
            show_market_icons: vVisibleEvents.show_market_icons,
            status: vVisibleEvents.status,
            rules: vVisibleEvents.rules,
            active_markets_count: vVisibleEvents.active_markets_count,
            total_markets_count: vVisibleEvents.total_markets_count,
            created_at: vVisibleEvents.created_at,
            updated_at: vVisibleEvents.updated_at,
          })
          .from(vVisibleEvents)
          .innerJoin(event_tags, eq(vVisibleEvents.id, event_tags.event_id))
          .innerJoin(tags, eq(event_tags.tag_id, tags.id))
          .where(and(...whereConditions, eq(tags.slug, tag)))

        if (bookmarked && userId) {
          tagQuery = db
            .select({
              id: vVisibleEvents.id,
              slug: vVisibleEvents.slug,
              title: vVisibleEvents.title,
              creator: vVisibleEvents.creator,
              icon_url: vVisibleEvents.icon_url,
              show_market_icons: vVisibleEvents.show_market_icons,
              status: vVisibleEvents.status,
              rules: vVisibleEvents.rules,
              active_markets_count: vVisibleEvents.active_markets_count,
              total_markets_count: vVisibleEvents.total_markets_count,
              created_at: vVisibleEvents.created_at,
              updated_at: vVisibleEvents.updated_at,
            })
            .from(vVisibleEvents)
            .innerJoin(event_tags, eq(vVisibleEvents.id, event_tags.event_id))
            .innerJoin(tags, eq(event_tags.tag_id, tags.id))
            .innerJoin(bookmarks, eq(vVisibleEvents.id, bookmarks.event_id))
            .where(and(...whereConditions, eq(tags.slug, tag), eq(bookmarks.user_id, userId)))
        }

        baseResults = await tagQuery
          .orderBy(desc(vVisibleEvents.id))
          .limit(limit)
          .offset(validOffset)
      }
      else if (bookmarked && userId) {
        // Need to filter by bookmarks only
        baseResults = await db
          .select({
            id: vVisibleEvents.id,
            slug: vVisibleEvents.slug,
            title: vVisibleEvents.title,
            creator: vVisibleEvents.creator,
            icon_url: vVisibleEvents.icon_url,
            show_market_icons: vVisibleEvents.show_market_icons,
            status: vVisibleEvents.status,
            rules: vVisibleEvents.rules,
            active_markets_count: vVisibleEvents.active_markets_count,
            total_markets_count: vVisibleEvents.total_markets_count,
            created_at: vVisibleEvents.created_at,
            updated_at: vVisibleEvents.updated_at,
          })
          .from(vVisibleEvents)
          .innerJoin(bookmarks, eq(vVisibleEvents.id, bookmarks.event_id))
          .where(and(...whereConditions, eq(bookmarks.user_id, userId)))
          .orderBy(desc(vVisibleEvents.id))
          .limit(limit)
          .offset(validOffset)
      }
      else {
        // No special filtering needed
        baseResults = await db
          .select()
          .from(vVisibleEvents)
          .where(and(...whereConditions))
          .orderBy(desc(vVisibleEvents.id))
          .limit(limit)
          .offset(validOffset)
      }

      // Get unique event IDs
      const eventIds = [...new Set(baseResults.map(event => event.id))].filter(Boolean) as string[]

      if (eventIds.length === 0) {
        return []
      }

      // Get full event data with manual joins since relations aren't set up
      const eventsQuery = db
        .select({
          // Event fields
          id: events.id,
          slug: events.slug,
          title: events.title,
          creator: events.creator,
          icon_url: events.icon_url,
          show_market_icons: events.show_market_icons,
          status: events.status,
          rules: events.rules,
          active_markets_count: events.active_markets_count,
          total_markets_count: events.total_markets_count,
          created_at: events.created_at,
          updated_at: events.updated_at,
        })
        .from(events)
        .where(inArray(events.id, eventIds))

      const eventsData = await eventsQuery

      // Get markets data for these events
      const marketsData = await db
        .select({
          event_id: markets.event_id,
          condition_id: markets.condition_id,
          title: markets.title,
          short_title: markets.short_title,
          slug: markets.slug,
          icon_url: markets.icon_url,
          is_active: markets.is_active,
          is_resolved: markets.is_resolved,
          current_volume_24h: markets.current_volume_24h,
          total_volume: markets.total_volume,
          created_at: markets.created_at,
        })
        .from(markets)
        .where(inArray(markets.event_id, eventIds))

      // Get conditions data
      const conditionIds = marketsData.map(m => m.condition_id)
      const conditionsData = conditionIds.length > 0
        ? await db
            .select()
            .from(conditions)
            .where(inArray(conditions.id, conditionIds))
        : []

      // Get outcomes data
      const outcomesData = conditionIds.length > 0
        ? await db
            .select()
            .from(outcomes)
            .where(inArray(outcomes.condition_id, conditionIds))
        : []

      // Get event tags
      const eventTagsData = await db
        .select({
          event_id: event_tags.event_id,
          tag_id: event_tags.tag_id,
        })
        .from(event_tags)
        .where(inArray(event_tags.event_id, eventIds))

      // Get tags data
      const tagIds = eventTagsData.map(et => et.tag_id)
      const tagsData = tagIds.length > 0
        ? await db
            .select()
            .from(tags)
            .where(inArray(tags.id, tagIds))
        : []

      // Get bookmarks if userId provided (and not already filtered)
      let bookmarksData: any[] = []
      if (userId && !bookmarked) {
        bookmarksData = await db
          .select()
          .from(bookmarks)
          .where(
            and(
              inArray(bookmarks.event_id, eventIds),
              eq(bookmarks.user_id, userId),
            ),
          )
      }
      else if (bookmarked && userId) {
        // If we filtered by bookmarks, get all bookmarks for these events
        bookmarksData = await db
          .select()
          .from(bookmarks)
          .where(inArray(bookmarks.event_id, eventIds))
      }

      // Combine the data - ONLY include events that have markets (like markets!inner in Supabase)
      const results = eventsData
        .map((eventRecord) => {
          const eventMarkets = marketsData.filter(m => m.event_id === eventRecord.id)
          const eventTags = eventTagsData.filter(et => et.event_id === eventRecord.id)
          const eventBookmarks = bookmarksData.filter(b => b.event_id === eventRecord.id)

          return {
            ...eventRecord,
            markets: eventMarkets.map((market) => {
              const condition = conditionsData.find(c => c.id === market.condition_id)
              const marketOutcomes = outcomesData.filter(o => o.condition_id === market.condition_id)

              return {
                ...market,
                condition: condition
                  ? {
                      ...condition,
                      outcomes: marketOutcomes,
                    }
                  : null,
              }
            }),
            eventTags: eventTags.map((et) => {
              const tag = tagsData.find(t => t.id === et.tag_id)
              return {
                ...et,
                tag,
              }
            }),
            bookmarks: eventBookmarks,
          }
        })
        .filter(eventResult => eventResult.markets.length > 0) // Only events with markets (like markets!inner)

      // Transform results using eventResource function
      const transformedEvents = results.map((eventResult: any) =>
        eventResource(eventResult as DrizzleEventResult, userId),
      )

      // Add trending event filtering using eventResource transformation
      if (!bookmarked && tag === 'trending') {
        const trendingEvents = transformedEvents.filter((eventItem: Event) => eventItem.is_trending)
        return trendingEvents
      }

      // Implement new event filtering excluding hide-from-new tag
      if (tag === 'new') {
        const newEvents = transformedEvents
          .filter((eventItem: Event) => !eventItem.tags.some((t: any) => t.slug === HIDE_FROM_NEW_TAG_SLUG))
          .sort((a: Event, b: Event) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        return newEvents
      }

      return transformedEvents
    })
  },

  async getIdBySlug(slug: string): Promise<QueryResult<{ id: string }>> {
    'use cache'

    return executeQuery(async () => {
      const result = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.slug, slug))
        .limit(1)

      if (result.length === 0) {
        throw new Error('Event not found')
      }

      return result[0]
    })
  },

  async getEventTitleBySlug(slug: string): Promise<QueryResult<{ title: string }>> {
    'use cache'

    return executeQuery(async () => {
      const result = await db
        .select({ title: events.title })
        .from(events)
        .where(eq(events.slug, slug))
        .limit(1)

      if (result.length === 0) {
        throw new Error('Event not found')
      }

      return result[0]
    })
  },

  async getEventBySlug(slug: string, userId: string = ''): Promise<QueryResult<Event>> {
    'use cache'

    return executeQuery(async () => {
      // Get event data
      const eventData = await db
        .select()
        .from(events)
        .where(eq(events.slug, slug))
        .limit(1)

      if (eventData.length === 0) {
        throw new Error('Event not found')
      }

      const eventRecord = eventData[0]

      // Get markets data for this event
      const marketsData = await db
        .select({
          condition_id: markets.condition_id,
          event_id: markets.event_id,
          title: markets.title,
          short_title: markets.short_title,
          slug: markets.slug,
          icon_url: markets.icon_url,
          is_active: markets.is_active,
          is_resolved: markets.is_resolved,
          current_volume_24h: markets.current_volume_24h,
          total_volume: markets.total_volume,
          created_at: markets.created_at,
        })
        .from(markets)
        .where(eq(markets.event_id, eventRecord.id))

      // Get conditions data
      const conditionIds = marketsData.map(m => m.condition_id)
      const conditionsData = conditionIds.length > 0
        ? await db
            .select()
            .from(conditions)
            .where(inArray(conditions.id, conditionIds))
        : []

      // Get outcomes data
      const outcomesData = conditionIds.length > 0
        ? await db
            .select()
            .from(outcomes)
            .where(inArray(outcomes.condition_id, conditionIds))
        : []

      // Get event tags
      const eventTagsData = await db
        .select({
          event_id: event_tags.event_id,
          tag_id: event_tags.tag_id,
        })
        .from(event_tags)
        .where(eq(event_tags.event_id, eventRecord.id))

      // Get tags data
      const tagIds = eventTagsData.map(et => et.tag_id)
      const tagsData = tagIds.length > 0
        ? await db
            .select()
            .from(tags)
            .where(inArray(tags.id, tagIds))
        : []

      // Get bookmarks if userId provided
      let bookmarksData: any[] = []
      if (userId) {
        bookmarksData = await db
          .select()
          .from(bookmarks)
          .where(
            and(
              eq(bookmarks.event_id, eventRecord.id),
              eq(bookmarks.user_id, userId),
            ),
          )
      }

      // Combine the data
      const result = {
        ...eventRecord,
        markets: marketsData.map((market) => {
          const condition = conditionsData.find(c => c.id === market.condition_id)
          const marketOutcomes = outcomesData.filter(o => o.condition_id === market.condition_id)

          return {
            ...market,
            condition: condition
              ? {
                  ...condition,
                  outcomes: marketOutcomes,
                }
              : null,
          }
        }),
        eventTags: eventTagsData.map((et) => {
          const tag = tagsData.find(t => t.id === et.tag_id)
          return {
            ...et,
            tag,
          }
        }),
        bookmarks: bookmarksData,
      }

      // Transform the result using eventResource
      const transformedEvent = eventResource(result as DrizzleEventResult, userId)

      // Apply cache tagging for user-specific results
      cacheTag(cacheTags.event(`${transformedEvent.id}:${userId}`))

      return transformedEvent
    })
  },

  async getRelatedEventsBySlug(slug: string, options: RelatedEventOptions = {}): Promise<QueryResult<RelatedEvent[]>> {
    'use cache'

    return executeQuery(async () => {
      const tagSlug = options.tagSlug?.toLowerCase()

      // Query current event tags using Drizzle joins
      const currentEventResult = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.slug, slug))
        .limit(1)

      if (currentEventResult.length === 0) {
        throw new Error('Could not retrieve event by slug.')
      }

      const currentEvent = currentEventResult[0]

      // Handle tag slug filtering and ID extraction
      const currentTagsResult = await db
        .select({
          tag_id: event_tags.tag_id,
          tag_slug: tags.slug,
        })
        .from(event_tags)
        .innerJoin(tags, eq(event_tags.tag_id, tags.id))
        .where(eq(event_tags.event_id, currentEvent.id))

      if (currentTagsResult.length === 0) {
        return []
      }

      const tagRecords = currentTagsResult
        .map(record => ({
          id: record.tag_id,
          slug: record.tag_slug,
        }))
        .filter(record => record.id !== null)

      const currentTagIds = tagRecords.map(tag => tag.id)

      const selectedTagIds = tagSlug
        ? tagRecords.filter(tag => tag.slug === tagSlug).map(tag => tag.id)
        : currentTagIds

      if (selectedTagIds.length === 0) {
        return []
      }

      // Create query for events with matching tags using Drizzle operations
      const relatedEventsResult = await db
        .select({
          id: events.id,
          slug: events.slug,
          title: events.title,
          market_icon_url: markets.icon_url,
          tag_id: event_tags.tag_id,
        })
        .from(events)
        .innerJoin(markets, eq(events.id, markets.event_id))
        .innerJoin(event_tags, eq(events.id, event_tags.event_id))
        .where(
          and(
            ne(events.slug, slug),
            inArray(event_tags.tag_id, selectedTagIds),
          ),
        )
        .limit(20)

      if (relatedEventsResult.length === 0) {
        return []
      }

      // Group results by event to handle multiple markets per event
      const eventMap = new Map<string, {
        id: string
        slug: string
        title: string
        icon_url: string
        tag_ids: number[]
        market_count: number
      }>()

      relatedEventsResult.forEach((row) => {
        const existing = eventMap.get(row.id)
        if (existing) {
          existing.tag_ids.push(row.tag_id)
          existing.market_count++
        }
        else {
          eventMap.set(row.id, {
            id: row.id,
            slug: row.slug,
            title: row.title,
            icon_url: row.market_icon_url || '',
            tag_ids: [row.tag_id],
            market_count: 1,
          })
        }
      })

      // Filter events with exactly one market and implement common tag count calculation
      const tagsToCompare = tagSlug ? selectedTagIds : currentTagIds

      return Array.from(eventMap.values())
        .filter(event => event.market_count === 1)
        .map((event) => {
          const commonTagsCount = event.tag_ids.filter(tagId => tagsToCompare.includes(tagId)).length
          return {
            id: event.id,
            slug: event.slug,
            title: event.title,
            icon_url: getSupabaseImageUrl(event.icon_url),
            common_tags_count: commonTagsCount,
          }
        })
        .filter(event => event.common_tags_count > 0)
        .sort((a, b) => b.common_tags_count - a.common_tags_count)
        .slice(0, 3)
    })
  },

  async getEventActivity(args: ActivityArgs): Promise<QueryResult<ActivityOrder[]>> {
    'use cache'

    return executeQuery(async () => {
      // Build orders query with user, outcome, condition, market, and event joins
      const baseQuery = db
        .select({
          id: orders.id,
          side: orders.side,
          amount: orders.amount,
          price: orders.price,
          created_at: orders.created_at,
          status: orders.status,
          user_id: users.id,
          user_username: users.username,
          user_address: users.address,
          user_image: users.image,
          outcome_text: outcomes.outcome_text,
          outcome_index: outcomes.outcome_index,
          outcome_token_id: outcomes.token_id,
          condition_id: conditions.id,
          market_title: markets.title,
          market_slug: markets.slug,
          market_icon_url: markets.icon_url,
          event_slug: events.slug,
        })
        .from(orders)
        .innerJoin(users, eq(orders.user_id, users.id))
        .innerJoin(outcomes, eq(orders.token_id, outcomes.token_id))
        .innerJoin(conditions, eq(orders.condition_id, conditions.id))
        .innerJoin(markets, eq(conditions.id, markets.condition_id))
        .innerJoin(events, eq(markets.event_id, events.id))
        .where(eq(events.slug, args.slug))
        .orderBy(desc(orders.id))

      // Handle pagination and optional minimum amount filtering
      let results
      if (args.minAmount && args.minAmount > 0) {
        // If minimum amount filtering is needed, fetch more records initially
        results = await baseQuery.limit(args.limit * 2).offset(args.offset)
      }
      else {
        // Standard pagination
        results = await baseQuery.limit(args.limit).offset(args.offset)
      }

      if (!results || results.length === 0) {
        return []
      }

      // Transform order records into ActivityOrder objects
      let activities: ActivityOrder[] = results
        .filter((order: any) => order.user_id && order.outcome_text && order.event_slug)
        .map((order: any) => transformActivityOrder(order))

      // Implement total value calculation and minimum amount filtering
      if (args.minAmount && args.minAmount > 0) {
        const minAmount = args.minAmount
        activities = activities.filter(activity => activity.total_value >= minAmount)
        // Limit to requested amount after filtering
        activities = activities.slice(0, args.limit)
      }

      return activities
    })
  },

  async getEventTopHolders(eventSlug: string, conditionId?: string | null): Promise<QueryResult<HoldersResult>> {
    'use cache'

    return executeQuery(async () => {
      // Execute get_event_top_holders procedure using Drizzle
      const holdersData = await db.execute(
        sql`SELECT * FROM get_event_top_holders(${eventSlug}, ${conditionId}, 10)`,
      )

      if (!holdersData || holdersData.length === 0) {
        return { yesHolders: [], noHolders: [] }
      }

      const yesHolders: TopHolder[] = []
      const noHolders: TopHolder[] = []

      // Separate yes and no holders based on outcome index
      holdersData.forEach((holder: any) => {
        const topHolder: TopHolder = {
          user: {
            id: holder.user_id,
            username: holder.username,
            address: holder.address,
            image: holder.image
              ? getSupabaseImageUrl(holder.image)
              : `https://avatar.vercel.sh/${holder.address}.png`,
          },
          netPosition: Number(holder.net_position),
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

      return { yesHolders, noHolders }
    })
  },
}
