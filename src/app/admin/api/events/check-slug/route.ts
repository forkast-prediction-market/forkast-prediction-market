import { NextResponse } from 'next/server'
import { EventRepository } from '@/lib/db/queries/event'
import { UserRepository } from '@/lib/db/queries/user'

export async function GET(request: Request) {
  const currentUser = await UserRepository.getCurrentUser()
  if (!currentUser || !currentUser.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const rawSlug = searchParams.get('slug')?.trim()

  if (!rawSlug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const normalizedSlug = rawSlug.toLowerCase()

  const { data, error } = await EventRepository.getIdBySlug(normalizedSlug)
  if (error && !(error as string).includes('Event not found')) {
    console.error('Failed to validate slug uniqueness:', error)
    return NextResponse.json({ error: 'Failed to validate slug' }, { status: 500 })
  }

  return NextResponse.json({ exists: Boolean(data) })
}
