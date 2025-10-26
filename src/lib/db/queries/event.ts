import type { ActivityOrder, Event, QueryResult, TopHolder } from '@/types'
import { and, desc, eq, exists, ilike, sql } from 'drizzle-orm'
import { unstable_cacheTag as cacheTag } from 'next/cache'
import { cacheTags } from '@/lib/cache-tags'
import { OUTCOME_INDEX } from '@/lib/constants'
import { users } from '@/lib/db/schema/auth/tables'
import { bookmarks } from '@/lib/db/schema/bookmarks/tables'
import { conditions, event_tags, events, markets, outcomes, tags } from '@/lib/db/schema/events/tables'
import { orders } from '@/lib/db/schema/orders/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'
import { getSupabaseImageUrl } from '@/lib/supabase'

const HIDE_FROM_NEW_TAG_SLUG = 'hide-from-new'

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

type EventWithTags = typeof events.$inferSelect & {
  eventTags: (typeof event_tags.$inferSelect & {
    tag: typeof tags.$inferSelect
  })[]
}

type EventWithTagsAndMarkets = EventWithTags & {
  markets: (typeof markets.$inferSelect)[]
}

interface HoldersResult {
  yesHolders: TopHolder[]
  noHolders: TopHolder[]
}

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

function eventResource(event: DrizzleEventResult, userId: string): Event {
  const tagRecords = (event.eventTags ?? [])
    .map(et => et.tag)
    .filter(tag => Boolean(tag?.slug))

  const marketsWithDerivedValues = event.markets.map((market: any) => {
    const rawOutcomes = (market.condition?.outcomes || []) as Array<typeof outcomes.$inferSelect>
    const normalizedOutcomes = rawOutcomes.map((outcome) => {
      const currentPrice = outcome.current_price != null ? Number(outcome.current_price) : undefined

      return {
        ...outcome,
        outcome_index: Number(outcome.outcome_index || 0),
        payout_value: outcome.payout_value != null ? Number(outcome.payout_value) : undefined,
        current_price: currentPrice,
        volume_24h: Number(outcome.volume_24h || 0),
        total_volume: Number(outcome.total_volume || 0),
      }
    })

    const primaryOutcome = normalizedOutcomes.find(outcome => outcome.outcome_index === OUTCOME_INDEX.YES) ?? normalizedOutcomes[0]
    const yesPrice = typeof primaryOutcome?.current_price === 'number' ? primaryOutcome.current_price : null
    const probability = typeof yesPrice === 'number' ? yesPrice * 100 : 0
    const normalizedCurrentVolume24h = Number(market.current_volume_24h || 0)
    const normalizedTotalVolume = Number(market.total_volume || 0)

    return {
      ...market,
      question_id: market.condition?.id || '',
      title: market.short_title || market.title,
      probability,
      price: typeof yesPrice === 'number' ? yesPrice : 0,
      volume: normalizedTotalVolume,
      current_volume_24h: normalizedCurrentVolume24h,
      total_volume: normalizedTotalVolume,
      outcomes: normalizedOutcomes,
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
    }
  })

  const totalRecentVolume = marketsWithDerivedValues.reduce(
    (sum: number, market: any) => sum + (typeof market.current_volume_24h === 'number' ? market.current_volume_24h : 0),
    0,
  )
  const isRecentlyUpdated = event.updated_at instanceof Date
    ? (Date.now() - event.updated_at.getTime()) < 1000 * 60 * 60 * 24 * 3
    : false
  const isTrending = totalRecentVolume > 0 || isRecentlyUpdated

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
    end_date: event.end_date?.toISOString() ?? null,
    markets: marketsWithDerivedValues,
    tags: tagRecords.map(tag => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      isMainCategory: Boolean(tag.is_main_category),
    })),
    main_tag: getEventMainTag(tagRecords),
    is_bookmarked: event.bookmarks?.some(bookmark => bookmark.user_id === userId) || false,
    is_trending: isTrending,
  }
}

function getEventMainTag(tags: any[] | undefined): string {
  if (!tags?.length) {
    return 'World'
  }

  const mainTag = tags.find(tag => tag.is_main_category)
  return mainTag?.name || tags[0].name
}

function transformActivityOrder(order: any): ActivityOrder {
  const userImage = order.user_image
    ? getSupabaseImageUrl(order.user_image)
    : `https://avatar.vercel.sh/${order.user_address || 'unknown'}.png`

  const amount = Number(order.amount || 0)
  const price = Number(order.price || 0.5)
  const totalValue = amount * price

  return {
    id: order.id || '',
    user: {
      id: order.user_id || '',
      username: order.user_username || null,
      address: order.user_address || '',
      image: userImage,
    },
    side: order.side === 0 ? 'buy' : 'sell',
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
      const limit = 40
      const validOffset = Number.isNaN(offset) || offset < 0 ? 0 : offset

      const whereConditions = []

      whereConditions.push(eq(events.status, 'active'))

      if (search) {
        whereConditions.push(ilike(events.title, `%${search}%`))
      }

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

      whereConditions[0] = and(
        eq(events.status, 'active'),
        sql`NOT EXISTS (
          SELECT 1
          FROM ${event_tags} et
          JOIN ${tags} t ON t.id = et.tag_id
          WHERE et.event_id = ${events.id} AND t.hide_events = TRUE
        )`,
      )

      const eventsData = await db.query.events.findMany({
        where: and(...whereConditions),
        with: {
          markets: {
            with: {
              condition: {
                with: { outcomes: true },
              },
            },
          },

          eventTags: {
            with: { tag: true },
          },

          ...(userId && {
            bookmarks: {
              where: eq(bookmarks.user_id, userId),
            },
          }),
        },
        limit,
        offset: validOffset,
        orderBy: tag === 'new' ? desc(events.created_at) : desc(events.id),
      }) as DrizzleEventResult[]

      const eventsWithMarkets = eventsData
        .filter(event => event.markets?.length > 0)
        .map(event => eventResource(event as DrizzleEventResult, userId))

      if (!bookmarked && tag === 'trending') {
        return {
          data: eventsWithMarkets.filter(event => event.is_trending),
          error: null,
        }
      }

      return { data: eventsWithMarkets, error: null }
    })
  },

  async getIdBySlug(slug: string): Promise<QueryResult<{ id: string }>> {
    'use cache'

    return runQuery(async () => {
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
      const eventResult = await db.query.events.findFirst({
        where: eq(events.slug, slug),
        with: {
          markets: {
            with: {
              condition: {
                with: { outcomes: true },
              },
            },
          },
          eventTags: {
            with: { tag: true },
          },
          ...(userId && {
            bookmarks: {
              where: eq(bookmarks.user_id, userId),
            },
          }),
        },
      })

      if (!eventResult) {
        throw new Error('Event not found')
      }

      const transformedEvent = eventResource(eventResult as DrizzleEventResult, userId)

      cacheTag(cacheTags.event(`${transformedEvent.id}:${userId}`))

      return { data: transformedEvent, error: null }
    })
  },

  async getRelatedEventsBySlug(slug: string, options: RelatedEventOptions = {}): Promise<QueryResult<RelatedEvent[]>> {
    'use cache'

    return runQuery(async () => {
      const tagSlug = options.tagSlug?.toLowerCase()

      const currentEvent = await db.query.events.findFirst({
        where: eq(events.slug, slug),
        with: {
          eventTags: {
            with: { tag: true },
          },
        },
      }) as EventWithTags | undefined

      if (!currentEvent) {
        return { data: [], error: null }
      }

      let selectedTagIds = currentEvent.eventTags.map(et => et.tag_id)
      if (tagSlug && tagSlug !== 'all' && tagSlug.trim() !== '') {
        const matchingTags = currentEvent.eventTags.filter(et => et.tag.slug === tagSlug)
        selectedTagIds = matchingTags.map(et => et.tag_id)

        if (selectedTagIds.length === 0) {
          return { data: [], error: null }
        }
      }

      if (selectedTagIds.length === 0) {
        return { data: [], error: null }
      }

      const relatedEvents = await db.query.events.findMany({
        where: sql`${events.slug} != ${slug}`,
        with: {
          eventTags: true,
          markets: {
            columns: {
              icon_url: true,
            },
          },
        },
        limit: 50,
      }) as EventWithTagsAndMarkets[]

      const results = relatedEvents
        .filter((event) => {
          if (event.markets.length !== 1) {
            return false
          }

          const eventTagIds = event.eventTags.map(et => et.tag_id)
          return eventTagIds.some(tagId => selectedTagIds.includes(tagId))
        })
        .map((event) => {
          const eventTagIds = event.eventTags.map(et => et.tag_id)
          const commonTagsCount = eventTagIds.filter(tagId => selectedTagIds.includes(tagId)).length

          return {
            id: event.id,
            slug: event.slug,
            title: event.title,
            icon_url: event.markets[0]?.icon_url || '',
            common_tags_count: commonTagsCount,
          }
        })
        .filter(event => event.common_tags_count > 0)
        .sort((a, b) => b.common_tags_count - a.common_tags_count)
        .slice(0, 20)

      if (!results?.length) {
        return { data: [], error: null }
      }

      const transformedResults = results
        .map(row => ({
          id: String(row.id),
          slug: String(row.slug),
          title: String(row.title),
          icon_url: getSupabaseImageUrl(String(row.icon_url || '')),
          common_tags_count: Number(row.common_tags_count),
        }))
        .filter(event => event.common_tags_count > 0)
        .slice(0, 3)

      return { data: transformedResults, error: null }
    })
  },

  async getEventActivity(args: ActivityArgs): Promise<QueryResult<ActivityOrder[]>> {
    'use cache'

    return runQuery(async () => {
      const whereConditions = [eq(events.slug, args.slug)]

      if (args.minAmount && args.minAmount > 0) {
        whereConditions.push(sql`${orders.maker_amount} >= ${args.minAmount}`)
      }
      const results = await db
        .select({
          id: orders.id,
          side: orders.side,
          amount: orders.maker_amount,
          price: sql<number>`CASE
            WHEN ${orders.maker_amount} + ${orders.taker_amount} > 0
            THEN ${orders.taker_amount}::numeric / (${orders.maker_amount} + ${orders.taker_amount})::numeric
            ELSE 0.5
          END`.as('price'),
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
          total_value: sql<number>`${orders.maker_amount}`.as('total_value'),
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

      if (!results?.length) {
        return { data: [], error: null }
      }

      const activities: ActivityOrder[] = results
        .filter(order => order.user_id && order.outcome_text && order.event_slug)
        .map(order => transformActivityOrder(order))

      return { data: activities, error: null }
    })
  },

  async getEventTopHolders(eventSlug: string, conditionId?: string | null): Promise<QueryResult<HoldersResult>> {
    'use cache'

    return runQuery(async () => {
      const holdersData = await db.execute(
        sql`SELECT * FROM get_event_top_holders(${eventSlug}, ${conditionId}, 10)`,
      )

      if (!holdersData?.length) {
        return { data: { yesHolders: [], noHolders: [] }, error: null }
      }

      const yesHolders: TopHolder[] = []
      const noHolders: TopHolder[] = []

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

        if (topHolder.outcomeIndex === OUTCOME_INDEX.YES) {
          yesHolders.push(topHolder)
        }
        else {
          noHolders.push(topHolder)
        }
      }

      return { data: { yesHolders, noHolders }, error: null }
    })
  },
}
