import type { ClobOrderType, OrderSide } from '@/types'
import { and, eq } from 'drizzle-orm'
import { orders } from '@/lib/db/schema/orders/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'

export const OrderRepository = {
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
  }) {
    return await runQuery(async () => {
      const result = await db
        .insert(orders)
        .values(args)
        .returning()

      return { data: result[0], error: null }
    })
  },

  async cancelOrder(orderId: string, userId: string) {
    return await runQuery(async () => {
      const result = await db
        .update(orders)
        .set({
          status: 'cancelled',
        })
        .where(and(
          eq(orders.id, orderId),
          eq(orders.user_id, userId),
          eq(orders.status, 'pending'),
        ))
        .returning()

      if (result.length === 0) {
        return {
          data: null,
          error: 'No matching order found or order cannot be cancelled',
        }
      }

      return { data: result[0], error: null }
    })
  },
}
