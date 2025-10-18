import { NextResponse } from 'next/server'
import { EventRepository } from '@/lib/db/event'

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  try {
    const { data: events, error } = await EventRepository.getRelatedEventsBySlug(slug)
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch related events.' },
        { status: 500 },
      )
    }

    return NextResponse.json(events)
  }
  catch {
    return NextResponse.json(
      { error: 'Failed to fetch related events.' },
      { status: 500 },
    )
  }
}
