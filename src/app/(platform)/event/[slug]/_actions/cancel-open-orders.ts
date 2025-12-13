'use server'

import { cancelOrderAction } from '@/app/(platform)/event/[slug]/_actions/cancel-order'

interface BulkCancelResult {
  failed: Array<{ id: string, error: string }>
}

export async function cancelMultipleOrdersAction(orderIds: Array<unknown>): Promise<BulkCancelResult> {
  const uniqueOrderIds = Array.from(
    new Set(
      orderIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
    ),
  )

  if (!uniqueOrderIds.length) {
    return { failed: [] }
  }

  const failed: BulkCancelResult['failed'] = []

  for (const orderId of uniqueOrderIds) {
    const result = await cancelOrderAction(orderId)
    if (result?.error) {
      failed.push({ id: orderId, error: result.error })
    }
  }

  return { failed }
}
