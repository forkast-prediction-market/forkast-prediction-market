import { NextResponse } from 'next/server'
import { UserRepository } from '@/lib/db/queries/user'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await UserRepository.getCurrentUser()
    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        { error: 'Event slug is required.' },
        { status: 400 },
      )
    }

    if (!user) {
      return NextResponse.json({ data: [] })
    }

    const result = await UserRepository.getUserOutcomePositionsByEvent({
      userId: user.id,
      eventSlug: slug,
    })

    if (result.error) {
      console.error('Error fetching user positions for event:', result.error)
      return NextResponse.json(
        { error: 'Failed to fetch positions.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: result.data ?? [] })
  }
  catch (error) {
    console.error('Unexpected error in event user positions API:', error)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 },
    )
  }
}
