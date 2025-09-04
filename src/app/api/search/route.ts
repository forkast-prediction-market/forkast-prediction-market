import { NextResponse } from 'next/server'
import { EventModel } from '@/lib/db/events'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return NextResponse.json([])
  }

  try {
    const { data, error } = await EventModel.listEvents({
      tag: '',
      search: query,
    })

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json(data)
  }
  catch (error) {
    console.error('Error in search API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
