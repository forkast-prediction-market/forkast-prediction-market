import { NextResponse } from 'next/server'
import { TagRepository } from '@/lib/db/tag'
import { UserRepository } from '@/lib/db/user'

export async function GET() {
  const currentUser = await UserRepository.getCurrentUser()
  if (!currentUser || !currentUser.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await TagRepository.getMainTags()
  if (error) {
    console.error('Failed to fetch main tags:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }

  const tags = (data ?? []).map(tag => ({
    name: tag.name,
    slug: tag.slug,
  }))

  return NextResponse.json({ tags })
}
