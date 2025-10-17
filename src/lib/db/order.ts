import { supabaseAdmin } from '@/lib/supabase'

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
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: args.user_id,
        condition_id: args.condition_id,
        token_id: args.token_id,
        type: args.type || 'market',
        side: args.side,
        amount: args.amount,
        price: args.price,
        status: 'pending',
        affiliate_user_id: args.affiliate_user_id ?? null,
        trade_fee_bps: args.trade_fee_bps ?? 0,
        affiliate_share_bps: args.affiliate_share_bps ?? 0,
        fork_fee_amount: args.fork_fee_amount ?? 0,
        affiliate_fee_amount: args.affiliate_fee_amount ?? 0,
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
