'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { cacheTags } from '@/lib/cache-tags'
import { EventRepository } from '@/lib/db/queries/event'
import { UserRepository } from '@/lib/db/queries/user'
import { syncEventTradingSnapshot } from '@/lib/trading/sync-event'

interface RefreshMarketSnapshotInput {
  slug: string
}

export async function refreshMarketSnapshotAction({ slug }: RefreshMarketSnapshotInput) {
  if (!slug) {
    return { error: 'Missing event slug.' }
  }

  try {
    await syncEventTradingSnapshot(slug)
    const [user, eventIdResult] = await Promise.all([
      UserRepository.getCurrentUser().catch(() => null),
      EventRepository.getIdBySlug(slug).catch(() => ({ data: null })),
    ])

    const eventId = eventIdResult?.data?.id
    const userId = user?.id ?? ''

    if (eventId) {
      revalidateTag(cacheTags.event(`${eventId}:${userId}`))
    }

    revalidatePath(`/event/${slug}`)
    return { success: true }
  }
  catch (error) {
    console.error('Failed to refresh market snapshot.', error)
    return { error: 'Unable to refresh market data. Please try again.' }
  }
}
