import type { ActivityOrder, Event, QueryResult, Tag, TopHolder } from '@/types'
import { and, desc, eq, exists, ilike, sql } from 'drizzle-orm'
import { unstable_cacheTag as cacheTag } from 'next/cache'
import { cacheTags } from '@/lib/cache-tags'
import { runQuery } from '@/lib/db/utils/run-query'
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
type DrizzleEventResult = typeof events.$inferSelect & {
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

    return await runQuery(async () => {
      // Calculate pagination values
      const limit = 40
      const validOffset = Number.isNaN(offset) || offset < 0 ? 0 : offset

      // Build where conditions for the single query
      const whereConditions = []

      // Base condition - only active events
      whereConditions.push(eq(events.status, 'active'))

      // Add search filtering directly in WHERE clause
      if (search) {
        whereConditions.push(ilike(events.title, `%${search}%`))
      }

      // Tag filtering using EXISTS subquery (except for trending/new which are handled later)
      if (tag && tag !== 'trending' && tag !== 'new') {
        whereConditions.push(
          exists(
            db.select()
              .from(event_tags)
              .innerJoin(tags, eq(event_tags.tag_id, tags.id))
              .where(and(
                eq(event_tags.event_id, events.id),
                eq(tags.slug, tag),
              )),
          ),
        )
      }

      // New event filtering - exclude events with hide-from-new tag at database level
      if (tag === 'new') {
        whereConditions.push(
          sql`NOT ${exists(
            db.select()
              .from(event_tags)
              .innerJoin(tags, eq(event_tags.tag_id, tags.id))
              .where(and(
                eq(event_tags.event_id, events.id),
                eq(tags.slug, HIDE_FROM_NEW_TAG_SLUG),
              )),
          )}`,
        )
      }

      // Bookmark filtering using EXISTS subquery
      if (bookmarked && userId) {
        whereConditions.push(
          exists(
            db.select()
              .from(bookmarks)
              .where(and(
                eq(bookmarks.event_id, events.id),
                eq(bookmarks.user_id, userId),
              )),
          ),
        )
      }

      // Execute single relational query using db.query API
      const queryConfig: any = {
        where: and(...whereConditions),
        with: {
          markets: {
            with: {
              condition: {
                with: {
                  outcomes: true,
                },
              },
            },
          },
          eventTags: {
            with: {
              tag: true,
            },
          },
        },
        limit,
        offset: validOffset,
        // Use created_at ordering for new events, otherwise use id ordering
        orderBy: tag === 'new' ? desc(events.created_at) : desc(events.id),
      }

      // Add bookmarks relation conditionally
      if (userId) {
        queryConfig.with.bookmarks = {
          where: eq(bookmarks.user_id, userId),
        }
      }

      const eventsData = await db.query.events.findMany(queryConfig)

      // Filter out events without markets (equivalent to markets!inner in Supabase)
      const eventsWithMarkets = (eventsData as any[]).filter((event: any) => event.markets && event.markets.length > 0)

      // Transform results using eventResource function
      const transformedEvents = eventsWithMarkets.map((eventResult: any) =>
        eventResource(eventResult as DrizzleEventResult, userId),
      )

      // Handle trending filtering in application layer (business logic requirement)
      if (!bookmarked && tag === 'trending') {
        const trendingEvents = transformedEvents.filter((eventItem: Event) => eventItem.is_trending)
        return { data: trendingEvents, error: null }
      }

      // New event filtering and sorting is handled at database level
      if (tag === 'new') {
        return { data: transformedEvents, error: null }
      }

      return { data: transformedEvents, error: null }
    })
  },

  async getIdBySlug(slug: string): Promise<QueryResult<{ id: string }>> {
    'use cache'

    return runQuery(async () => {
      // Optimized single field query with proper indexing expectation
      const result = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.slug, slug))
        .limit(1)

      if (result.length === 0) {
        throw new Error('Event not found')
      }

      return { data: result[0], error: null }
    })
  },

  async getEventTitleBySlug(slug: string): Promise<QueryResult<{ title: string }>> {
    'use cache'

    return runQuery(async () => {
      // Optimized single field query with proper indexing expectation
      const result = await db
        .select({ title: events.title })
        .from(events)
        .where(eq(events.slug, slug))
        .limit(1)

      if (result.length === 0) {
        throw new Error('Event not found')
      }

      return { data: result[0], error: null }
    })
  },

  async getEventBySlug(slug: string, userId: string = ''): Promise<QueryResult<Event>> {
    'use cache'

    return runQuery(async () => {
      // Build query configuration for single relational query
      const queryConfig: any = {
        where: eq(events.slug, slug),
        with: {
          markets: {
            with: {
              condition: {
                with: {
                  outcomes: true,
                },
              },
            },
          },
          eventTags: {
            with: {
              tag: true,
            },
          },
        },
      }

      // Add bookmarks relation conditionally based on userId
      if (userId) {
        queryConfig.with.bookmarks = {
          where: eq(bookmarks.user_id, userId),
        }
      }

      // Execute single relational query using db.query API
      const eventResult = await db.query.events.findFirst(queryConfig)

      if (!eventResult) {
        throw new Error('Event not found')
      }

      // Transform the result using eventResource
      const transformedEvent = eventResource(eventResult as DrizzleEventResult, userId)

      // Apply cache tagging for user-specific results
      cacheTag(cacheTags.event(`${transformedEvent.id}:${userId}`))

      return { data: transformedEvent, error: null }
    })
  },

  async getRelatedEventsBySlug(slug: string, options: RelatedEventOptions = {}): Promise<QueryResult<RelatedEvent[]>> {
    'use cache'

    return runQuery(async () => {
      const tagSlug = options.tagSlug?.toLowerCase()

      // Single optimized query using CTEs and JOINs to get related events with common tag counts
      const relatedEventsQuery = sql`
        WITH current_event_tags AS (
          SELECT et.tag_id, t.slug as tag_slug
          FROM events e
          INNER JOIN event_tags et ON e.id = et.event_id
          INNER JOIN tags t ON et.tag_id = t.id
          WHERE e.slug = ${slug}
        ),
        target_tags AS (
          SELECT tag_id
          FROM current_event_tags
          ${tagSlug ? sql`WHERE tag_slug = ${tagSlug}` : sql``}
        ),
        related_events_with_counts AS (
          SELECT
            e.id,
            e.slug,
            e.title,
            m.icon_url,
            COUNT(DISTINCT m.id) as market_count,
            COUNT(DISTINCT et.tag_id) as common_tags_count
          FROM events e
          INNER JOIN markets m ON e.id = m.event_id
          INNER JOIN event_tags et ON e.id = et.event_id
          INNER JOIN target_tags tt ON et.tag_id = tt.tag_id
          WHERE e.slug != ${slug}
          GROUP BY e.id, e.slug, e.title, m.icon_url
          HAVING COUNT(DISTINCT m.id) = 1 AND COUNT(DISTINCT et.tag_id) > 0
          ORDER BY common_tags_count DESC, e.id DESC
          LIMIT 3
        )
        SELECT
          id,
          slug,
          title,
          icon_url,
          common_tags_count
        FROM related_events_with_counts
      `

      const results = await db.execute(relatedEventsQuery)

      if (!results || results.length === 0) {
        return { data: [], error: null }
      }

      // Transform results to RelatedEvent format
      const transformedResults = results.map((row: any) => ({
        id: String(row.id),
        slug: String(row.slug),
        title: String(row.title),
        icon_url: getSupabaseImageUrl(String(row.icon_url || '')),
        common_tags_count: Number(row.common_tags_count),
      }))

      return { data: transformedResults, error: null }
    })
  },

  async getEventActivity(args: ActivityArgs): Promise<QueryResult<ActivityOrder[]>> {
    'use cache'

    return runQuery(async () => {
      // Build where conditions for the optimized single query
      const whereConditions = [eq(events.slug, args.slug)]

      // Add minimum amount filtering at database level if specified
      if (args.minAmount && args.minAmount > 0) {
        // Calculate total_value at database level: amount * price >= minAmount
        whereConditions.push(sql`(${orders.amount} * ${orders.price}) >= ${args.minAmount}`)
      }

      // Execute single optimized query with all necessary joins and filtering
      const results = await db
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
          // Calculate total_value at database level for efficiency
          total_value: sql<number>`(${orders.amount} * ${orders.price})`.as('total_value'),
        })
        .from(orders)
        .innerJoin(users, eq(orders.user_id, users.id))
        .innerJoin(outcomes, eq(orders.token_id, outcomes.token_id))
        .innerJoin(conditions, eq(orders.condition_id, conditions.id))
        .innerJoin(markets, eq(conditions.id, markets.condition_id))
        .innerJoin(events, eq(markets.event_id, events.id))
        .where(and(...whereConditions))
        .orderBy(desc(orders.id))
        .limit(args.limit)
        .offset(args.offset)

      if (!results || results.length === 0) {
        return { data: [], error: null }
      }

      // Transform order records into ActivityOrder objects
      const activities: ActivityOrder[] = results
        .filter((order: any) => order.user_id && order.outcome_text && order.event_slug)
        .map((order: any) => transformActivityOrder(order))

      return { data: activities, error: null }
    })
  },

  async getEventTopHolders(eventSlug: string, conditionId?: string | null): Promise<QueryResult<HoldersResult>> {
    'use cache'

    return runQuery(async () => {
      // Execute optimized get_event_top_holders procedure using Drizzle
      const holdersData = await db.execute(
        sql`SELECT * FROM get_event_top_holders(${eventSlug}, ${conditionId}, 10)`,
      )

      if (!holdersData || holdersData.length === 0) {
        return { data: { yesHolders: [], noHolders: [] }, error: null }
      }

      // Optimized data processing with single pass separation and transformation
      const yesHolders: TopHolder[] = []
      const noHolders: TopHolder[] = []

      // Process holders in single pass with optimized transformations
      for (const holder of holdersData) {
        const holderData = holder as any
        const topHolder: TopHolder = {
          user: {
            id: String(holderData.user_id),
            username: holderData.username || null,
            address: String(holderData.address),
            image: holderData.image
              ? getSupabaseImageUrl(String(holderData.image))
              : `https://avatar.vercel.sh/${String(holderData.address)}.png`,
          },
          netPosition: Number(holderData.net_position),
          outcomeIndex: Number(holderData.outcome_index),
          outcomeText: String(holderData.outcome_text),
        }

        // Efficiently separate holders based on outcome index
        if (topHolder.outcomeIndex === 0) {
          yesHolders.push(topHolder)
        }
        else if (topHolder.outcomeIndex === 1) {
          noHolders.push(topHolder)
        }
      }

      return { data: { yesHolders, noHolders }, error: null }
    })
  },
}
