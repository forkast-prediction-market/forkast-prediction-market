import { NextResponse } from 'next/server'
import { fetchAffiliateWidgetEvents } from '@/lib/affiliate-widget'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const limitParam = Number(searchParams.get('limit'))

  try {
    const events = await fetchAffiliateWidgetEvents({
      category,
      limit: Number.isFinite(limitParam) ? limitParam : undefined,
    })

    return NextResponse.json({ events })
  }
  catch (error) {
    console.error('Failed to load widget events', error)
    return NextResponse.json({ events: [] }, { status: 500 })
  }
}
