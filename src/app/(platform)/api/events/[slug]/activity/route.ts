import { NextResponse } from 'next/server'
import { EventRepository } from '@/lib/db/event'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)

    const limit = Number.parseInt(searchParams.get('limit') || '50', 10)
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10)
    const minAmountParam = searchParams.get('minAmount')
    const validatedLimit = Number.isNaN(limit) ? 50 : Math.min(Math.max(1, limit), 100)
    const validatedOffset = Number.isNaN(offset) ? 0 : Math.max(0, offset)

    let validatedMinAmount: number | undefined
    if (minAmountParam !== null) {
      const parsedMinAmount = Number.parseFloat(minAmountParam)
      if (!Number.isNaN(parsedMinAmount) && parsedMinAmount >= 0) {
        validatedMinAmount = parsedMinAmount
      }
      else {
        return NextResponse.json({ error: 'Invalid minAmount parameter. Must be a non-negative number.' }, { status: 400 })
      }
    }

    const { data: activities, error: activitiesError } = await EventRepository.getEventActivity({
      slug,
      limit: validatedLimit,
      offset: validatedOffset,
      minAmount: validatedMinAmount,
    })

    if (activitiesError) {
      console.error('Error fetching event activity:', activitiesError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json(activities || [])
  }
  catch (error) {
    console.error('Unexpected error in activity API route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
