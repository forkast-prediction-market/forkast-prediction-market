import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params

    // Fetch related events based on shared tags
    const { data: relatedEvents, error } = await supabaseAdmin
      .from('events')
      .select(
        `
        id,
        slug,
        title,
        description,
        icon_url,
        markets(
          name,
          slug,
          icon_url
        ),
        event_tags(
          tag_id
        )
      `,
      )
      .neq('slug', slug)
      .limit(20) // Fetch more to filter later

    if (error) {
      console.error('Error fetching related events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch related events' },
        { status: 500 },
      )
    }

    // Fetch current event tags
    const { data: currentEventTags } = await supabaseAdmin
      .from('events')
      .select(
        `
        event_tags(tag_id)
      `,
      )
      .eq('slug', slug)
      .single()

    const currentTagIds
      = currentEventTags?.event_tags?.map(et => et.tag_id) || []

    // Calculate common tags and sort
    const eventsWithCommonTags = (relatedEvents || [])
      .filter(event => event.markets && event.markets.length === 1) // Only with 1 market
      .map((event) => {
        const eventTagIds = event.event_tags?.map(et => et.tag_id) || []
        const commonTagsCount = eventTagIds.filter(tagId =>
          currentTagIds.includes(tagId),
        ).length

        return {
          id: event.id,
          slug: event.slug,
          title: event.title,
          description: event.description,
          icon_url: event.icon_url,
          market: event.markets[0], // Get the first (and only) market
          common_tags_count: commonTagsCount,
        }
      })
      .filter(event => event.common_tags_count > 0) // Only with common tags
      .sort((a, b) => b.common_tags_count - a.common_tags_count)
      .slice(0, 3)

    return NextResponse.json(eventsWithCommonTags)
  }
  catch (error) {
    console.error('Error in related events API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
