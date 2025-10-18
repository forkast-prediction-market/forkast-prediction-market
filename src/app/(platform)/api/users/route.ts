import type { PublicProfile } from '@/types'
import { NextResponse } from 'next/server'
import { UserRepository } from '@/lib/db/user'
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
      console.error('Error searching users:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    console.error('Error in user search API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
