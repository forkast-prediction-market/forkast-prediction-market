import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { EventRepository } from '@/lib/db/queries/event'
import { UserRepository } from '@/lib/db/queries/user'

export async function GET(
  request: Request,
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

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get('limit') || '50', 10)
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10)
    const conditionIdParam = searchParams.get('conditionId')
    const validatedLimit = Number.isNaN(limit) ? 50 : Math.min(Math.max(1, limit), 100)
    const validatedOffset = Number.isNaN(offset) ? 0 : Math.max(0, offset)
    const conditionId = conditionIdParam && conditionIdParam.trim().length > 0
      ? conditionIdParam.trim()
      : undefined

    const { data, error } = await EventRepository.getUserOpenOrdersBySlug({
      slug,
      userId: user.id,
      limit: validatedLimit,
      offset: validatedOffset,
      conditionId,
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
