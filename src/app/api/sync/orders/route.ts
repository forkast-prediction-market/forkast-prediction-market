import type { ClobOrderSnapshot } from '@/app/api/sync/orders/helpers'
import { NextResponse } from 'next/server'
import {
  DEFAULT_ORDER_SYNC_LIMIT,
  evaluateOrderSyncDecision,
  hasReachedTimeLimit,
  MAX_ORDER_SYNC_LIMIT,
  parseLimitParam,
  SYNC_TIME_LIMIT_MS,
} from '@/app/api/sync/orders/helpers'
import { isCronAuthorized } from '@/lib/auth-cron'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 300

const CLOB_BATCH_SIZE = 50
const CLOB_REQUEST_TIMEOUT_MS = 10_000
const CLOB_URL = process.env.CLOB_URL!

interface SupabaseOrderRow {
  id: string
  clob_order_id: string
  size_matched: string | null
}

interface SyncStats {
  scanned: number
  updated: number
  skippedLive: number
  markedUnmatched: number
  errors: { context: string, error: string }[]
  timeLimitReached: boolean
}

interface ClobOrderEnvelope {
  order: ClobOrderSnapshot
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!isCronAuthorized(authHeader, cronSecret)) {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
  }

  try {
    const stats = await syncOrders(request)
    return NextResponse.json({ success: true, ...stats })
  }
  catch (error: any) {
    console.error('orders-sync failed', error)
    return NextResponse.json({ success: false, error: error.message ?? 'Unknown error' }, { status: 500 })
  }
}

async function syncOrders(request: Request): Promise<SyncStats> {
  const url = new URL(request.url)
  const limit = parseLimitParam(url.searchParams.get('limit'), DEFAULT_ORDER_SYNC_LIMIT, MAX_ORDER_SYNC_LIMIT)
  const startedAt = Date.now()

  const { data: liveOrders, error: queryError } = await supabaseAdmin
    .from('orders')
    .select('id, clob_order_id, size_matched')
    .eq('status', 'live')
    .order('updated_at', { ascending: true })
    .limit(limit)

  if (queryError) {
    throw new Error(`Failed to load live orders: ${queryError.message}`)
  }

  const orders = liveOrders ?? []
  const stats: SyncStats = {
    scanned: orders.length,
    updated: 0,
    skippedLive: 0,
    markedUnmatched: 0,
    errors: [],
    timeLimitReached: false,
  }

  if (orders.length === 0) {
    return stats
  }

  const clobIdToLocal = new Map<string, SupabaseOrderRow>()
  for (const order of orders) {
    clobIdToLocal.set(order.clob_order_id, order)
  }

  const clobIds = orders.map(order => order.clob_order_id)
  const chunks = chunkIds(clobIds, CLOB_BATCH_SIZE)

  for (const chunk of chunks) {
    if (hasReachedTimeLimit(startedAt, Date.now(), SYNC_TIME_LIMIT_MS)) {
      stats.timeLimitReached = true
      break
    }

    try {
      const remoteOrders = await fetchClobOrders(chunk)
      const returnedIds = new Set<string>()

      for (const remoteOrder of remoteOrders) {
        const remoteId = remoteOrder.id
        returnedIds.add(remoteId)

        const local = clobIdToLocal.get(remoteId)
        if (!local) {
          continue
        }

        const decision = evaluateOrderSyncDecision(remoteOrder, local.size_matched)
        if (decision.type === 'skip_live') {
          stats.skippedLive++
          continue
        }

        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update(decision.payload)
          .eq('id', local.id)

        if (updateError) {
          stats.errors.push({ context: `update:${local.id}`, error: updateError.message })
        }
        else {
          stats.updated++
        }
      }

      const missingIds = chunk.filter(id => !returnedIds.has(id))
      for (const missingId of missingIds) {
        const local = clobIdToLocal.get(missingId)
        if (!local) {
          continue
        }

        const { error: missingUpdateError } = await supabaseAdmin
          .from('orders')
          .update({ status: 'unmatched' })
          .eq('id', local.id)

        if (missingUpdateError) {
          stats.errors.push({ context: `mark-unmatched:${local.id}`, error: missingUpdateError.message })
        }
        else {
          stats.updated++
          stats.markedUnmatched++
        }
      }
    }
    catch (error: any) {
      stats.errors.push({ context: `batch:${chunk.join(',')}`, error: error.message ?? String(error) })
    }
  }

  return stats
}

async function fetchClobOrders(ids: string[]): Promise<ClobOrderSnapshot[]> {
  if (ids.length === 0) {
    return []
  }

  const response = await fetch(`${CLOB_URL}/data/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ids.map(orderId => ({ orderId }))),
    signal: AbortSignal.timeout(CLOB_REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`CLOB request failed with status ${response.status}`)
  }

  const payload = await response.json()
  return payload.map((entry: any) => (entry as ClobOrderEnvelope).order)
}

function chunkIds(ids: string[], chunkSize: number): string[][] {
  const chunks: string[][] = []
  for (let index = 0; index < ids.length; index += chunkSize) {
    chunks.push(ids.slice(index, index + chunkSize))
  }
  return chunks
}
