import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
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
        { status: 422 },
      )
    }

    if (!user) {
      return NextResponse.json({ data: [] })
    }

    const { data, error } = await UserRepository.getUserOutcomePositionsByEvent({
      userId: user.id,
      eventSlug: slug,
    })

    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  }
  catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
