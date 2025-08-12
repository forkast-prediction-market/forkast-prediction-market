'use cache'

import type { Tag } from '@/lib/supabase'
import type { Event, EventCategory } from '@/types'
import { notFound } from 'next/navigation'
import { getSupabaseImageUrl } from '@/lib/mockData'
import { supabaseAdmin } from '@/lib/supabase'

export async function listEvents(category: string = 'trending', search: string = '', limit: number = 20) {
  const query = supabaseAdmin
    .from('events')
    .select(`
    *,
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
    event_tags!inner(
      tag:tags!inner(
        id,
        name,
        slug,
        is_main_category
      )
    )
  `)
    .order('active_markets_count', { ascending: false })
    .order('created_at', { ascending: false })

  if (category && category !== 'trending' && category !== 'new') {
    query.eq('event_tags.tag.slug', category)
  }

  if (search) {
    query.ilike('title', `%${search}%`)
  }

  if (limit) {
    query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching events:', error)
    throw error
  }

  const events: any[] = []
  if (data && data.length > 0) {
    for (const event of data) {
      events.push(eventResource(event))
    }
  }

  if (category === 'trending') {
    return events.filter(market => market.isTrending)
  }

  // Sort by new if necessary (by events created_at)
  if (category === 'new') {
    return events.sort((a, b) => {
      // Find the original event to get created_at
      const eventA = events.find(e => e.id.toString() === a.id)
      const eventB = events.find(e => e.id.toString() === b.id)
      if (!eventA || !eventB)
        return 0
      return (
        new Date(eventB.created_at).getTime()
          - new Date(eventA.created_at).getTime()
      )
    })
  }

  return events
}

export async function getEventBySlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select(
      `
        *,
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
    notFound()
  }

  return eventResource(data) as Event & any
}

function eventResource(data: any): Event {
  const event = {
    ...data,
    tags: data.event_tags?.map((et: any) => et.tag?.slug).filter(Boolean) || [],
    markets: data.markets.map((market: any) => ({
      ...market,
      oracle: market.conditions?.oracle,
      outcomes: market.conditions?.outcomes || [],
    })),
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
    }))

    return {
      id: event.id.toString(),
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
      icon_url: `${getSupabaseImageUrl(`${event.icon_url}`)}`,
      creatorAvatar: event.icon_url
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/forkast-assets/${event.icon_url}`
        : 'https://avatar.vercel.sh/creator.png',
      tags: event.tags,
      outcomes,
      show_market_icons: event.show_market_icons,
      rules: event.rules || undefined,
      oracle: event.markets[0]?.oracle || null,
    }
  }

  const outcomes = event.markets.map((market: any) => ({
    id: `${event.id}-${market.slug}`,
    name: market.short_title || market.name,
    probability: Math.random() * 100,
    price: Math.random() * 0.99 + 0.01,
    volume: Math.random() * 100000,
    avatar: market.icon_url
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/forkast-assets/${market.icon_url}`
      : `https://avatar.vercel.sh/${market.slug}.png`,
  }))

  return {
    id: event.id.toString(),
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
    icon_url: `${getSupabaseImageUrl(`${event.icon_url}`)}`,
    creatorAvatar: event.icon_url
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/forkast-assets/${event.icon_url}`
      : 'https://avatar.vercel.sh/creator.png',
    tags: event.tags,
    outcomes,
    show_market_icons: event.show_market_icons,
    rules: event.rules || undefined,
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
