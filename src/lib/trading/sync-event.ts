import { fetchConditionSnapshots } from '@/lib/clob/client'
import { EventRepository } from '@/lib/db/queries/event'
import { TradingRepository } from '@/lib/db/queries/trading'

const MAX_IDS_PER_REQUEST = 10

function chunk<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }

  return result
}

export async function syncEventTradingSnapshot(slug: string) {
  const { data, error } = await EventRepository.getEventConditionIds(slug)

  if (error || !data) {
    return
  }

  if (!data.conditionIds.length) {
    return
  }

  const snapshots = []
  const idChunks = chunk(data.conditionIds, MAX_IDS_PER_REQUEST)

  for (const ids of idChunks) {
    try {
      const response = await fetchConditionSnapshots(ids, 50)
      snapshots.push(...response)
    }
    catch (caughtError) {
      console.error(`Failed to fetch CLOB snapshots for conditions [${ids.join(', ')}].`, caughtError)
    }
  }

  if (!snapshots.length) {
    return
  }

  try {
    await TradingRepository.upsertConditionSnapshots(snapshots)
  }
  catch (caughtError) {
    console.error('Failed to persist CLOB snapshots to the database.', caughtError)
  }
}
