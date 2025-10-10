import { NextResponse } from 'next/server'
import { EventModel } from '@/lib/db/events'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const limit = Number.parseInt(searchParams.get('limit') || '50', 10)
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10)
    const minAmountParam = searchParams.get('minAmount')

    // Validate limit parameter (between 1 and 100)
    const validatedLimit = Number.isNaN(limit) ? 50 : Math.min(Math.max(1, limit), 100)

    // Validate offset parameter (non-negative)
    const validatedOffset = Number.isNaN(offset) ? 0 : Math.max(0, offset)

    // Validate minAmount parameter (optional, must be positive number if provided)
    let validatedMinAmount: number | undefined
    if (minAmountParam !== null) {
      const parsedMinAmount = Number.parseFloat(minAmountParam)
      if (!Number.isNaN(parsedMinAmount) && parsedMinAmount >= 0) {
        validatedMinAmount = parsedMinAmount
      }
      else {
        return NextResponse.json(
          { error: 'Invalid minAmount parameter. Must be a non-negative number.' },
          { status: 400 },
        )
      }
    }

    // Verify event exists by checking slug
    const { data: event, error: eventError } = await EventModel.getIdBySlug(slug)
    if (!event || eventError) {
      return NextResponse.json(
        { error: 'Event not found.' },
        { status: 404 },
      )
    }

    // Fetch activity data
    const { data: activities, error: activitiesError } = await EventModel.getEventActivity({
      eventSlug: slug,
      limit: validatedLimit,
      offset: validatedOffset,
      minAmount: validatedMinAmount,
    })

    if (activitiesError) {
      console.error('Error fetching event activity:', activitiesError)
      return NextResponse.json(
        { error: 'Failed to fetch event activity.' },
        { status: 500 },
      )
    }

    return NextResponse.json(activities || [])
  }
  catch (error) {
    console.error('Unexpected error in activity API route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
