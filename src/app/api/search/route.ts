import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return NextResponse.json([])
  }

  try {
    // Search events by title
    const { data: eventsByTitle, error: eventsError } = await supabaseAdmin
      .from('events')
      .select(`
        id,
        slug,
        title,
        icon_url
      `)
      .ilike('title', `%${query}%`)
      .limit(5)

    // Combine and deduplicate events
    const allEvents = []
    const eventIdsSet = new Set()

    // Add events from title search
    if (eventsByTitle) {
      for (const event of eventsByTitle) {
        if (!eventIdsSet.has(event.id)) {
          allEvents.push(event)
          eventIdsSet.add(event.id)
        }
      }
    }

    const events = allEvents.slice(0, 10)

    if (eventsError) {
      console.error('Error searching:', eventsError)
      return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
    }

    if (!events || events.length === 0) {
      return NextResponse.json([])
    }

    // Get markets for these events
    const eventIds = events.map(event => event.id)
    const { data: markets, error: marketsError } = await supabaseAdmin
      .from('markets')
      .select(`
        condition_id,
        name,
        short_title,
        slug,
        event_id,
        outcome_count,
        is_active,
        is_resolved,
        icon_url
      `)
      .in('event_id', eventIds)
      .eq('is_active', true)
      .eq('is_resolved', false)

    if (marketsError) {
      console.error('Error fetching markets:', marketsError)
      // Return events without market data as fallback
      const searchResults = events.map(event => ({
        id: event.id,
        eventSlug: event.slug,
        marketSlug: event.slug,
        eventTitle: event.title,
        marketTitle: event.title,
        iconUrl: event.icon_url,
        percentage: 50,
        displayText: '',
        outcomeCount: 2,
        isMultipleMarkets: false,
      }))
      return NextResponse.json(searchResults)
    }

    if (!markets || markets.length === 0) {
      return NextResponse.json([])
    }

    // Get outcomes for these markets
    const conditionIds = markets.map(market => market.condition_id)
    const { data: outcomes, error: outcomesError } = await supabaseAdmin
      .from('outcomes')
      .select(`
        condition_id,
        outcome_text,
        outcome_index,
        current_price
      `)
      .in('condition_id', conditionIds)

    if (outcomesError) {
      console.error('Error fetching outcomes:', outcomesError)
    }

    // Combine data and format results
    const searchResults = []

    for (const event of events) {
      const eventMarkets = markets.filter(market => market.event_id === event.id)

      if (eventMarkets.length === 0) {
        continue
      }

      // Find the winning market (the one with the highest winning outcome probability)
      let bestMarket = null
      let bestPercentage = 0
      let bestDisplayText = ''

      for (const market of eventMarkets) {
        const marketOutcomes = outcomes?.filter(outcome => outcome.condition_id === market.condition_id) || []

        if (marketOutcomes.length === 0) {
          continue
        }

        let marketPercentage = 50
        let marketDisplayText = ''
        let winningOutcome = null

        if (marketOutcomes.length === 2) {
          // Binary market - check if it's Yes/No
          const yesOutcome = marketOutcomes.find(o =>
            o.outcome_text.toLowerCase() === 'yes'
            || o.outcome_text.toLowerCase() === 'sim',
          )
          const noOutcome = marketOutcomes.find(o =>
            o.outcome_text.toLowerCase() === 'no'
            || o.outcome_text.toLowerCase() === 'não',
          )

          if (yesOutcome && noOutcome) {
            // Yes/No market - show percentage of Yes option
            marketPercentage = Math.round((yesOutcome.current_price || 0.5) * 100)
            marketDisplayText = '' // Don't show text below for Yes/No
            winningOutcome = yesOutcome
          }
          else {
            // Binary but not Yes/No - show winning outcome
            const sortedOutcomes = marketOutcomes.sort((a, b) => (b.current_price || 0) - (a.current_price || 0))
            winningOutcome = sortedOutcomes[0]
            marketPercentage = Math.round((winningOutcome.current_price || 0.5) * 100)
            marketDisplayText = winningOutcome.outcome_text
          }
        }
        else if (marketOutcomes.length > 2) {
          // Multiple outcomes - show the one with highest probability
          const sortedOutcomes = marketOutcomes.sort((a, b) => (b.current_price || 0) - (a.current_price || 0))
          winningOutcome = sortedOutcomes[0]
          marketPercentage = Math.round((winningOutcome.current_price || 0.5) * 100)
          marketDisplayText = winningOutcome.outcome_text
        }

        // Check if this market has a higher winning percentage than the current best
        const outcomePrice = winningOutcome?.current_price || 0.5
        if (outcomePrice > bestPercentage / 100) {
          bestMarket = market
          bestPercentage = marketPercentage
          bestDisplayText = marketDisplayText
        }
      }

      // Add only one result per event (the winning market)
      if (bestMarket) {
        let finalDisplayText = bestDisplayText

        // If multiple markets, show the market name instead of outcome
        if (eventMarkets.length > 1) {
          finalDisplayText = bestMarket.short_title || bestMarket.name
        }

        searchResults.push({
          id: event.id,
          eventSlug: event.slug,
          marketSlug: bestMarket.slug,
          eventTitle: event.title,
          marketTitle: bestMarket.short_title || bestMarket.name,
          iconUrl: event.icon_url,
          percentage: bestPercentage,
          displayText: finalDisplayText,
          outcomeCount: bestMarket.outcome_count,
          isMultipleMarkets: eventMarkets.length > 1,
        })
      }
    }

    return NextResponse.json(searchResults)
  }
  catch (error) {
    console.error('Error in search API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
