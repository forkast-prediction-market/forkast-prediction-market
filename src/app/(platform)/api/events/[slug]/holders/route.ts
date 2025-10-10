import { NextResponse } from 'next/server'
import { EventModel } from '@/lib/db/events'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { data: holdersData, error: holdersError } = await EventModel.getEventTopHolders(slug)

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
