import type { PublicProfile } from '@/types'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { UserRepository } from '@/lib/db/queries/user'
import { getSupabaseImageUrl } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('search')

  if (!query || query.length < 2) {
    return NextResponse.json([])
  }

  try {
    const { data, error } = await UserRepository.listUsers({
      search: query,
      limit: 10,
      sortBy: 'username',
      sortOrder: 'asc',
    })

    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    const profiles: PublicProfile[] = (data || []).map(user => ({
      address: user.address,
      username: user.username || undefined,
      image: user.image ? getSupabaseImageUrl(user.image) : `https://avatar.vercel.sh/${user.address}.png`,
      created_at: new Date(user.created_at),
    }))

    return NextResponse.json(profiles)
  }
  catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
