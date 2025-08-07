import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const limit = searchParams.get('limit')

    let query = supabaseAdmin
      .from('events')
      .select(
        `
        *,
        markets(
          condition_id,
          name,
          slug,
          short_title,
          outcome_count,
          icon_url,
          is_active,
          current_volume_24h,
          total_volume,
          open_interest
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
      .order('active_markets_count', { ascending: false })
      .order('created_at', { ascending: false })

    if (category && category !== 'trending' && category !== 'new') {
      query = query.eq('event_tags.tags.slug', category)
    }

    if (limit) {
      query = query.limit(Number.parseInt(limit))
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 },
      )
    }

    // Optimization: Fetch all outcomes at once
    const transformedData = []

    if (data && data.length > 0) {
      // 1. Collect all condition_ids
      const allConditionIds = []
      for (const event of data) {
        if (event.markets) {
          for (const market of event.markets) {
            allConditionIds.push(market.condition_id)
          }
        }
      }

      // 2. Fetch all outcomes at once (much more efficient)
      let allOutcomes = []
      if (allConditionIds.length > 0) {
        const { data: outcomes } = await supabaseAdmin
          .from('outcomes')
          .select('*')
          .in('condition_id', allConditionIds)
          .order('condition_id')
          .order('outcome_index')

        allOutcomes = outcomes || []
      }

      // 3. Create a map for fast lookup
      const outcomesMap = new Map()
      for (const outcome of allOutcomes) {
        if (!outcomesMap.has(outcome.condition_id)) {
          outcomesMap.set(outcome.condition_id, [])
        }
        outcomesMap.get(outcome.condition_id).push(outcome)
      }

      // 4. Transformar dados usando o mapa
      for (const event of data) {
        const marketsWithOutcomes = []

        if (event.markets) {
          for (const market of event.markets) {
            marketsWithOutcomes.push({
              ...market,
              outcomes: outcomesMap.get(market.condition_id) || [],
            })
          }
        }

        transformedData.push({
          ...event,
          tags:
            event.event_tags
              ?.map((et: { tag: unknown }) => et.tag)
              .filter(Boolean) || [],
          markets: marketsWithOutcomes,
        })
      }
    }

    // Add cache headers to improve performance
    const response = NextResponse.json(transformedData)
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=30, stale-while-revalidate=60',
    )

    return response
  }
  catch (error) {
    console.error('Error in events API:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
