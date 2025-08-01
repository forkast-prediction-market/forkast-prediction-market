import type { Market } from '@/types'
import { notFound } from 'next/navigation'
import EventDetail from '@/components/event/EventDetail'
import { supabaseAdmin } from '@/lib/supabase'

interface MarketPageProps {
  params: Promise<{
    slug: string
  }>
}

// Function to convert Event from Supabase to Market (server-side)
function convertEventToMarket(event: any): Market {
  // Se o evento tem apenas 1 market, usamos os outcomes como Yes/No
  if (event.markets.length === 1) {
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
      slug: event.slug,
      title: market.short_title || market.name,
      description: market.description || event.description || '',
      category: 'world', // simplificado para server-side
      probability: outcomes[0]?.probability || 50,
      volume: Math.random() * 1000000,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isResolved: market.is_resolved,
      isTrending: Math.random() > 0.7,
      creator: '0x1234...5678',
      creatorAvatar: event.icon_url
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/forkast-assets/${event.icon_url}`
        : 'https://avatar.vercel.sh/creator.png',
      tags: event.tags?.map((tag: any) => tag.slug) || [],
      outcomes,
      show_market_icons: event.show_market_icons,
      rules: event.rules || undefined,
      oracle: event.markets[0]?.oracle || null,
    }
  }

  // Multiple markets
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
    slug: event.slug,
    title: event.title,
    description: event.description || '',
    category: 'world',
    probability: 0,
    volume: Math.random() * 1000000,
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isResolved: false,
    isTrending: Math.random() > 0.7,
    creator: '0x1234...5678',
    creatorAvatar: event.icon_url
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/forkast-assets/${event.icon_url}`
      : 'https://avatar.vercel.sh/creator.png',
    tags: event.tags?.map((tag: any) => tag.slug) || [],
    outcomes,
    show_market_icons: event.show_market_icons,
    rules: event.rules || undefined,
  }
}

export default async function MarketPage({ params }: MarketPageProps) {
  const { slug } = await params

  try {
    // Direct query to Supabase (more reliable than internal fetch)
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
      console.error('Error fetching event:', error)
      notFound()
    }

    // Transform data to include outcomes from conditions
    const transformedData = {
      ...data,
      tags: data.event_tags?.map((et: any) => et.tag).filter(Boolean) || [],
      markets: data.markets.map((market: any) => ({
        ...market,
        oracle: market.conditions?.oracle,
        outcomes: market.conditions?.outcomes || [],
      })),
    }
    const market = convertEventToMarket(transformedData)

    return <EventDetail event={market} />
  }
  catch (error) {
    console.error('Error fetching event:', error)
    notFound()
  }
}
