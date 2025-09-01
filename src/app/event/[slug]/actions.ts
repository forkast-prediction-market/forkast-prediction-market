'use server'

import { redirect } from 'next/navigation'
import { toggleBookmark } from '@/lib/db/bookmarks'
import { UserModel } from '@/lib/db/users'

export async function bookmarkAction(eventId: string) {
  const user = await UserModel.getCurrentUser()
  if (!user) {
    redirect('/')
  }

  const userId = user.id
  await toggleBookmark(userId, eventId)
}
