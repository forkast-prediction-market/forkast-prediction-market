import { NextResponse } from 'next/server'
import { EventModel } from '@/lib/db/events'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const conditionId = searchParams.get('condition_id')

    const { data: holdersData, error: holdersError } = await EventModel.getEventTopHolders(slug, conditionId)

    if (!holdersData || holdersError) {
      console.error('Error fetching event holders:', holdersError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({
      yesHolders: holdersData.yesHolders || [],
      noHolders: holdersData.noHolders || [],
    })
  }
  catch (error) {
    console.error('Unexpected error in holders API route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
