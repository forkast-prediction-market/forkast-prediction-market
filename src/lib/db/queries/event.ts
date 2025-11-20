import type { ActivityOrder, Event, QueryResult, TopHolder } from '@/types'
import { and, desc, eq, exists, ilike, inArray, sql } from 'drizzle-orm'
import { cacheTag } from 'next/cache'
import { filterActivitiesByMinAmount } from '@/lib/activity/filter'
import { cacheTags } from '@/lib/cache-tags'
import { OUTCOME_INDEX } from '@/lib/constants'
import { users } from '@/lib/db/schema/auth/tables'
import { bookmarks } from '@/lib/db/schema/bookmarks/tables'
import { conditions, event_tags, events, markets, outcomes, tags } from '@/lib/db/schema/events/tables'
import { orders, v_condition_top_holders } from '@/lib/db/schema/orders/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'
import { getSupabaseImageUrl } from '@/lib/supabase'

const HIDE_FROM_NEW_TAG_SLUG = 'hide-from-new'

type PriceApiResponse = Record<string, { BUY?: string, SELL?: string } | undefined>
interface OutcomePrices { buy: number, sell: number }

async function fetchOutcomePrices(tokenIds: string[]): Promise<Map<string, OutcomePrices>> {
  const uniqueTokenIds = Array.from(new Set(tokenIds.filter(Boolean)))

  if (uniqueTokenIds.length === 0) {
    return new Map()
  }

  const endpoint = `${process.env.CLOB_URL!}/prices`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(uniqueTokenIds.map(tokenId => ({
        token_id: tokenId,
      }))),
      cache: 'no-store',
    })

    if (!response.ok) {
      return new Map(uniqueTokenIds.map(tokenId => [tokenId, { buy: 0.5, sell: 0.5 }]))
    }

    const data = await response.json() as PriceApiResponse
    const priceMap = new Map<string, OutcomePrices>()

    for (const [tokenId, priceBySide] of Object.entries(data ?? {})) {
      if (!priceBySide) {
        continue
      }

      const parsedBuy = priceBySide.BUY != null ? Number(priceBySide.BUY) : undefined
      const parsedSell = priceBySide.SELL != null ? Number(priceBySide.SELL) : undefined
      const normalizedBuy = parsedBuy != null && Number.isFinite(parsedBuy) ? parsedBuy : undefined
      const normalizedSell = parsedSell != null && Number.isFinite(parsedSell) ? parsedSell : undefined

      priceMap.set(tokenId, {
        buy: normalizedSell ?? normalizedBuy ?? 0.5,
        sell: normalizedBuy ?? normalizedSell ?? 0.5,
      })
    }

    for (const tokenId of uniqueTokenIds) {
      if (!priceMap.has(tokenId)) {
        priceMap.set(tokenId, { buy: 0.5, sell: 0.5 })
      }
    }

    return priceMap
  }
  catch (error) {
    console.error('Failed to fetch outcome prices from CLOB.', error)
    return new Map(uniqueTokenIds.map(tokenId => [tokenId, { buy: 0.5, sell: 0.5 }]))
  }
}

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

function eventResource(event: DrizzleEventResult, userId: string, priceMap: Map<string, OutcomePrices>): Event {
  const tagRecords = (event.eventTags ?? [])
    .map(et => et.tag)
    .filter(tag => Boolean(tag?.slug))

  const marketsWithDerivedValues = event.markets.map((market: any) => {
    const rawOutcomes = (market.condition?.outcomes || []) as Array<typeof outcomes.$inferSelect>
    const normalizedOutcomes = rawOutcomes.map((outcome) => {
      const outcomePrice = outcome.token_id ? priceMap.get(outcome.token_id) : undefined
      const buyPrice = outcomePrice?.buy ?? 0.5
      const sellPrice = outcomePrice?.sell ?? 0.5

      return {
        ...outcome,
        outcome_index: Number(outcome.outcome_index || 0),
        payout_value: outcome.payout_value != null ? Number(outcome.payout_value) : undefined,
        buy_price: buyPrice,
        sell_price: sellPrice,
      }
    })

    const primaryOutcome = normalizedOutcomes.find(outcome => outcome.outcome_index === OUTCOME_INDEX.YES) ?? normalizedOutcomes[0]
    const yesBuyPrice = primaryOutcome?.buy_price ?? 0.5
    const yesSellPrice = primaryOutcome?.sell_price ?? yesBuyPrice
    const yesMidPrice = (yesBuyPrice + yesSellPrice) / 2
    const probability = yesMidPrice * 100
    const normalizedCurrentVolume24h = Number(market.volume_24h || 0)
    const normalizedTotalVolume = Number(market.volume || 0)

    return {
      ...market,
      neg_risk: Boolean(market.neg_risk),
      neg_risk_other: Boolean(market.neg_risk_other),
      question_id: market.condition?.id || '',
      title: market.short_title || market.title,
      probability,
      price: yesMidPrice,
      volume: normalizedTotalVolume,
      volume_24h: normalizedCurrentVolume24h,
      outcomes: normalizedOutcomes,
      icon_url: getSupabaseImageUrl(market.icon_url),
      condition: market.condition
        ? {
            ...market.condition,
            outcome_slot_count: Number(market.condition.outcome_slot_count || 0),
            payout_denominator: market.condition.payout_denominator ? Number(market.condition.payout_denominator) : undefined,
            volume: Number(market.condition.volume || 0),
            open_interest: Number(market.condition.open_interest || 0),
            active_positions_count: Number(market.condition.active_positions_count || 0),
          }
        : null,
    }
  })

  const totalRecentVolume = marketsWithDerivedValues.reduce(
    (sum: number, market: any) => sum + (typeof market.volume_24h === 'number' ? market.volume_24h : 0),
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
    creator: event.creator || '',
    icon_url: getSupabaseImageUrl(event.icon_url),
    show_market_icons: event.show_market_icons ?? true,
    enable_neg_risk: Boolean(event.enable_neg_risk),
    neg_risk_augmented: Boolean(event.neg_risk_augmented),
    neg_risk: Boolean(event.neg_risk),
    neg_risk_market_id: event.neg_risk_market_id || undefined,
    status: (event.status ?? 'draft') as Event['status'],
    rules: event.rules || undefined,
    active_markets_count: Number(event.active_markets_count || 0),
    total_markets_count: Number(event.total_markets_count || 0),
    created_at: event.created_at?.toISOString() || new Date().toISOString(),
    updated_at: event.updated_at?.toISOString() || new Date().toISOString(),
    end_date: event.end_date?.toISOString() ?? null,
    volume: marketsWithDerivedValues.reduce(
      (sum: number, market: { volume: number }) => sum + (market.volume ?? 0),
      0,
    ),
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

function safeNumber(value: unknown): number {
  if (typeof value === 'bigint') {
    return Number(value)
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function transformActivityOrder(order: any): ActivityOrder {
  const userImage = order.user_image
    ? getSupabaseImageUrl(order.user_image)
    : `https://avatar.vercel.sh/${order.user_address || 'unknown'}.png`

  const side = order.side === 0 ? 'buy' : 'sell'
  const makerAmount = safeNumber(order.maker_amount)
  const takerAmount = safeNumber(order.taker_amount)
  const amount = side === 'buy' ? takerAmount : makerAmount
  const price = Number(order.price || 0.5)
  const parsedTotalValue = order.total_value != null ? Number(order.total_value) : Number.NaN
  const totalValue = Number.isFinite(parsedTotalValue) ? parsedTotalValue : amount * price

  return {
    id: order.id || '',
    user: {
      id: order.user_id || '',
      username: order.user_username || null,
      address: order.user_address || '',
      image: userImage,
    },
    side,
    amount: amount.toString(),
    price: price.toString(),
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
        whereConditions.push(ilike(events.title, `%${search.toLowerCase()}%`))
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

      const baseWhere = and(...whereConditions)

      let eventsData: DrizzleEventResult[] = []

      if (tag === 'trending') {
        const trendingVolumeOrder = sql<number>`COALESCE(
          NULLIF((
            SELECT SUM(${markets.volume_24h})
            FROM ${markets}
            WHERE ${markets.event_id} = ${events.id}
          ), 0),
          (
            SELECT SUM(${markets.volume})
            FROM ${markets}
            WHERE ${markets.event_id} = ${events.id}
          ),
          0
        )`

        const trendingEventIds = await db
          .select({ id: events.id })
          .from(events)
          .where(baseWhere)
          .orderBy(desc(trendingVolumeOrder), desc(events.created_at))
          .limit(limit)
          .offset(validOffset)

        if (trendingEventIds.length === 0) {
          return { data: [], error: null }
        }

        const orderedIds = trendingEventIds.map(event => event.id)
        const orderIndex = new Map(orderedIds.map((id, index) => [id, index]))

        const trendingData = await db.query.events.findMany({
          where: and(
            baseWhere,
            inArray(events.id, orderedIds),
          ),
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
        }) as DrizzleEventResult[]

        eventsData = trendingData.sort((a, b) => {
          const aIndex = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER
          const bIndex = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER
          return aIndex - bIndex
        })
      }
      else {
        const orderByClause = tag === 'new'
          ? [desc(events.created_at)]
          : [desc(events.id)]

        eventsData = await db.query.events.findMany({
          where: baseWhere,
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
          orderBy: orderByClause,
        }) as DrizzleEventResult[]
      }

      const tokensForPricing = eventsData.flatMap(event =>
        (event.markets ?? []).flatMap(market =>
          (market.condition?.outcomes ?? []).map(outcome => outcome.token_id).filter(Boolean),
        ),
      )

      const priceMap = await fetchOutcomePrices(tokensForPricing)

      const eventsWithMarkets = eventsData
        .filter(event => event.markets?.length > 0)
        .map(event => eventResource(event as DrizzleEventResult, userId, priceMap))

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
      }) as DrizzleEventResult

      if (!eventResult) {
        throw new Error('Event not found')
      }

      const outcomeTokenIds = (eventResult.markets ?? []).flatMap((market: any) =>
        (market.condition?.outcomes ?? []).map((outcome: any) => outcome.token_id).filter(Boolean),
      )

      const priceMap = await fetchOutcomePrices(outcomeTokenIds)
      const transformedEvent = eventResource(eventResult as DrizzleEventResult, userId, priceMap)

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
    cacheTag(cacheTags.activity(args.slug))

    return runQuery(async () => {
      const priceExpression = sql<number>`CASE
        WHEN ${orders.maker_amount} + ${orders.taker_amount} > 0
        THEN ${orders.taker_amount}::numeric / (${orders.maker_amount} + ${orders.taker_amount})::numeric
        ELSE 0.5
      END`

      const totalValueExpression = sql<number>`CASE
        WHEN ${orders.maker_amount} + ${orders.taker_amount} > 0
        THEN (${orders.taker_amount}::numeric * ${orders.taker_amount}::numeric) / (${orders.maker_amount} + ${orders.taker_amount})::numeric
        ELSE 0.5 * ${orders.taker_amount}::numeric
      END`

      const whereConditions = [
        eq(events.slug, args.slug),
        eq(orders.status, 'matched'),
      ]

      if (args.minAmount && args.minAmount > 0) {
        whereConditions.push(sql`${totalValueExpression} >= ${args.minAmount}`)
      }

      const results = await db
        .select({
          id: orders.id,
          side: orders.side,
          maker_amount: orders.maker_amount,
          taker_amount: orders.taker_amount,
          price: priceExpression,
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
          market_title: markets.short_title,
          market_slug: markets.slug,
          market_icon_url: markets.icon_url,
          event_slug: events.slug,
          total_value: totalValueExpression,
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

      const filteredActivities = filterActivitiesByMinAmount(activities, args.minAmount)

      return { data: filteredActivities, error: null }
    })
  },

  async getEventTopHolders(conditionId: string): Promise<QueryResult<HoldersResult>> {
    'use cache'
    cacheTag(cacheTags.holders(conditionId))

    return runQuery(async () => {
      const holdersData = await db
        .select({
          user_id: v_condition_top_holders.user_id,
          username: v_condition_top_holders.username,
          address: v_condition_top_holders.address,
          image: v_condition_top_holders.image,
          outcome_index: v_condition_top_holders.outcome_index,
          outcome_text: v_condition_top_holders.outcome_text,
          net_position: v_condition_top_holders.net_position,
        })
        .from(v_condition_top_holders)
        .where(eq(v_condition_top_holders.condition_id, conditionId))
        .orderBy(
          v_condition_top_holders.outcome_index,
          desc(v_condition_top_holders.net_position),
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
          net_position: String(holderData.net_position),
          outcome_index: Number(holderData.outcome_index),
          outcome_text: String(holderData.outcome_text),
        }

        if (topHolder.outcome_index === OUTCOME_INDEX.YES) {
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
