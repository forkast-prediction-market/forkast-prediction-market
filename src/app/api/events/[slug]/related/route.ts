import { NextResponse } from 'next/server'
import { getRelatedEventsBySlug } from '@/lib/db/related-events'

export const dynamic = 'force-static'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  try {
    const events = await getRelatedEventsBySlug(slug)
    return NextResponse.json(events)
  }
  catch {
    return NextResponse.json(
      { error: 'Failed to fetch related events' },
      { status: 500 },
    )
  }
}
