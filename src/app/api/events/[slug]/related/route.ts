import { NextResponse } from 'next/server'
import { EventModel } from '@/lib/db/events'

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  try {
    const events = await EventModel.getRelatedEventsBySlug(slug)
    return NextResponse.json(events)
  }
  catch {
    return NextResponse.json(
      { error: 'Failed to fetch related events.' },
      { status: 500 },
    )
  }
}
