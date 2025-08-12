import { NextResponse } from 'next/server'
import { getChildTags } from '@/lib/db/tags'

export const dynamic = 'force-static'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  try {
    const tags = await getChildTags(slug)
    return NextResponse.json(tags)
  }
  catch {
    return NextResponse.json(
      { error: 'Failed to fetch child tags' },
      { status: 500 },
    )
  }
}
