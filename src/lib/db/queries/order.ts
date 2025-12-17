import type { ClobOrderType, OrderSide } from '@/types'
import { and, eq, inArray } from 'drizzle-orm'
import { orders } from '@/lib/db/schema/orders/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'

export const OrderRepository = {
  async findUserOrderById(orderId: string, userId: string) {
    return await runQuery(async () => {
      const [order] = await db
        .select({
          id: orders.id,
          clob_order_id: orders.clob_order_id,
        })
        .from(orders)
        .where(and(
          eq(orders.id, orderId),
          eq(orders.user_id, userId),
        ))
        .limit(1)

      if (!order) {
        return { data: null, error: 'Order not found' }
      }

      return { data: order, error: null }
    })
  },

  async createOrder(args: {
    // begin blockchain data
    salt: bigint
    maker: string
    signer: string
    taker: string
    referrer: string
    affiliate: string
    token_id: string
    maker_amount: bigint
    taker_amount: bigint
    expiration: bigint
    nonce: bigint
    fee_rate_bps: number
    affiliate_percentage: number
    side: OrderSide
    signature_type: number
    signature: string
    // end blockchain data

    type: ClobOrderType
    user_id: string
    affiliate_user_id: string
    condition_id: string
    clob_order_id: string
  }) {
    return await runQuery(async () => {
      const result = await db
        .insert(orders)
        .values(args)
        .returning()

      return { data: result[0], error: null }
    })
  },

  async findUserOrdersByClobIds(userId: string, clobOrderIds: string[]) {
    if (!clobOrderIds.length) {
      return { data: [], error: null }
    }

    return await runQuery(async () => {
      const rows = await db
        .select({
          id: orders.id,
          clob_order_id: orders.clob_order_id,
          condition_id: orders.condition_id,
        })
        .from(orders)
        .where(and(
          eq(orders.user_id, userId),
          inArray(orders.clob_order_id, clobOrderIds),
        ))

      return { data: rows, error: null }
    })
  },
}
