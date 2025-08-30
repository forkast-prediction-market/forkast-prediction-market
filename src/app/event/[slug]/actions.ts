'use server'

import { redirect } from 'next/navigation'
import { toggleBookmark } from '@/lib/db/bookmarks'
import { getCurrentUser } from '@/lib/db/users'

export async function bookmarkAction(eventId: number) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/')
  }

  const userId = user.id
  await toggleBookmark(userId, eventId)
}
