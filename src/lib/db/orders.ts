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
