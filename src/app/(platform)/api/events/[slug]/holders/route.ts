import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { EventRepository } from '@/lib/db/queries/event'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const conditionId = searchParams.get('condition_id')

    const { data: holdersData, error: holdersError } = await EventRepository.getEventTopHolders(slug, conditionId)

    if (!holdersData || holdersError) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({
      yesHolders: holdersData.yesHolders || [],
      noHolders: holdersData.noHolders || [],
    })
  }
  catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
