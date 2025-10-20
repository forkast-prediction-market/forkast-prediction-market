import { NextResponse } from 'next/server'
import { EventRepository } from '@/lib/db/event'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const tagSlug = searchParams.get('tag') ?? undefined

  try {
    const { data: events, error } = await EventRepository.getRelatedEventsBySlug(slug, { tagSlug: tagSlug ?? undefined })
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
