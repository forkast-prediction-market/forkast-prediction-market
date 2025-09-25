import { supabaseAdmin } from '@/lib/supabase'

export const OrderModel = {
  async createOrder(orderData: {
    user_id: string
    condition_id: string
    outcome_index: number
    side: 'buy' | 'sell'
    amount: number
    price?: number
    order_type?: 'market' | 'limit'
    affiliate_user_id?: string | null
    trade_fee_bps?: number
    affiliate_share_bps?: number
    fork_fee_amount?: number
    affiliate_fee_amount?: number
  }) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: orderData.user_id,
        condition_id: orderData.condition_id,
        outcome_index: orderData.outcome_index,
        order_type: orderData.order_type || 'market',
        side: orderData.side,
        amount: orderData.amount,
        price: orderData.price,
        status: 'pending',
        affiliate_user_id: orderData.affiliate_user_id ?? null,
        trade_fee_bps: orderData.trade_fee_bps ?? 0,
        affiliate_share_bps: orderData.affiliate_share_bps ?? 0,
        fork_fee_amount: orderData.fork_fee_amount ?? 0,
        affiliate_fee_amount: orderData.affiliate_fee_amount ?? 0,
      })
      .select()
      .single()

    return { data, error }
  },

  async cancelOrder(orderId: string, userId: string) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'cancelled',
      })
      .eq('id', orderId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .select()
      .single()

    return { data, error }
  },
}
