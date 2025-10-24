import { and, eq } from 'drizzle-orm'
import { orders } from '@/lib/db/schema/orders/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'

export const OrderRepository = {
  async createOrder(args: {
    user_id: string
    condition_id: string
    token_id: string
    side: 'buy' | 'sell'
    amount: number
    price?: number
    type?: 'market' | 'limit'
    affiliate_user_id?: string | null
    trade_fee_bps?: number
    affiliate_share_bps?: number
    fork_fee_amount?: number
    affiliate_fee_amount?: number
  }) {
    return await runQuery(async () => {
      const insertData = {
        user_id: args.user_id,
        condition_id: args.condition_id,
        token_id: args.token_id,
        type: args.type || 'market',
        side: args.side,
        amount: args.amount.toString(),
        price: args.price?.toString(),
        status: 'pending',
        affiliate_user_id: args.affiliate_user_id ?? null,
        trade_fee_bps: args.trade_fee_bps ?? 0,
        affiliate_share_bps: args.affiliate_share_bps ?? 0,
        fork_fee_amount: args.fork_fee_amount?.toString() ?? '0',
        affiliate_fee_amount: args.affiliate_fee_amount?.toString() ?? '0',
      }

      const result = await db
        .insert(orders)
        .values(insertData)
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
