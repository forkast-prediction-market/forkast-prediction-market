import { toMicro } from '@/lib/formatters'

export const DEFAULT_ORDER_SYNC_LIMIT = 200
export const MAX_ORDER_SYNC_LIMIT = 500
export const SYNC_TIME_LIMIT_MS = 250_000

export interface ClobOrderSnapshot {
  id: string
  status: string
  sizeMatched: string
}

export interface OrderUpdatePayload {
  status: string
  size_matched?: string
}

export type OrderSyncDecision
  = | { type: 'skip_live' }
    | { type: 'update', payload: OrderUpdatePayload }

export function parseLimitParam(
  rawValue: string | null,
  defaultLimit: number = DEFAULT_ORDER_SYNC_LIMIT,
  maxLimit: number = MAX_ORDER_SYNC_LIMIT,
): number {
  if (!rawValue) {
    return defaultLimit
  }

  const parsed = Number.parseInt(rawValue, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultLimit
  }

  return Math.min(parsed, maxLimit)
}

export function hasReachedTimeLimit(startedAtMs: number, nowMs: number, limitMs: number = SYNC_TIME_LIMIT_MS): boolean {
  return nowMs - startedAtMs >= limitMs
}

export function convertSizeMatchedToMicro(value: string): string {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '0'
  }

  return toMicro(numeric)
}

export function evaluateOrderSyncDecision(
  remoteOrder: ClobOrderSnapshot,
  localSizeMatched: string | null,
): OrderSyncDecision {
  if (remoteOrder.status === 'live') {
    return { type: 'skip_live' }
  }

  const updatePayload: OrderUpdatePayload = {
    status: remoteOrder.status,
  }

  const convertedSize = convertSizeMatchedToMicro(remoteOrder.sizeMatched)
  if (convertedSize !== localSizeMatched) {
    updatePayload.size_matched = convertedSize
  }

  return { type: 'update', payload: updatePayload }
}
